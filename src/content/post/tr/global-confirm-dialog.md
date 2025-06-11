---
title: "Global Onay Dialogu"
description: "Vue.js'te onay dialoglarının yönetimine dair bir bakış açısı"
publishDate: "11 June 2025"
tags: ["vue", "javascript"]
lang: "tr"
---

# Vue.js'te Onay Dialoglarının Yönetimi

Vue ve React ile proje geliştirirken bir çok yerde onay dialogu kullanıyoruz. Bu dialogların çoğu aynı şekilde çalışıyor ve 
aynı şekilde görünüyor. Her sayfada aynı bileşeni import ederek ve aynı durumları(state) tanımlayarak kullanıyoruz. Bu yaklaşımın 
ne kadar yorucu ve verimsiz olduğunu kodu tekrar açıp okuduğum zaman anlıyorum. Bu yazıda tek bir state ve tek bir merkezi dialog ile bu sorunu kendimce çözüm bulmaya çalıştım.

---

## Global State ve Teleport ile Yeniden Kullanılabilir Onay Dialogu

Bu verimsizliği aşmak için **Vue'daki global state mekanizmasını** ve **Teleport** özelliğini kullanarak uygulama genelinde tek bir onay dialogu oluşturdum. Bu sayede, hangi bileşende olursak olalım, merkezi bir sistem üzerinden onay dialogunu kolayca çağırabiliyor ve özelleştirebiliyoruz.

İşte bu sorunu nasıl çözdüğümün temel adımları:

### 1. `useConfirm` Composables'ı: Onay Mantığının Merkezi

İlk olarak, onay dialogunun mantığını yönetecek bir **composables** (`useConfirm.ts`) oluşturdum. Bu dosya, dialogun görünürlüğünü, başlığını, mesajını ve buton metinlerini kontrol eden reaktif değişkenleri (`ref`) barındırıyor. Ayrıca, onay veya iptal durumunda çalışacak geri çağırım fonksiyonlarını (`onConfirm`, `onCancel`) yönetiyor.

```typescript

import { ref } from 'vue';

interface ConfirmData {
    message: string;
    title: string;
    confirmButtonText: string;
    cancelButtonText: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
}

interface ShowConfirmOptions {
    message: string;
    title?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}


const currentConfirm = ref<ConfirmData | null>(null);

const currentOnConfirm = ref<(() => void) | null>(null);
const currentOnCancel = ref<(() => void) | null>(null);

export const useConfirm = () => {
    const showConfirm = (options: ShowConfirmOptions): void => {
        currentOnConfirm.value = options.onConfirm || null;
        currentOnCancel.value = options.onCancel || null;

        currentConfirm.value = {
            message: options.message,
            title: options.title || 'Onay',
            confirmButtonText: options.confirmButtonText || 'Onayla',
            cancelButtonText: options.cancelButtonText || 'İptal Et',
            confirmButtonClass: options.confirmButtonClass,
            cancelButtonClass: options.cancelButtonClass,
        };
    };

    
    const hideConfirm = (): void => {
        currentConfirm.value = null;
        currentOnConfirm.value = null;
        currentOnCancel.value = null;
    };

    const handleConfirmAction = (result: boolean): void => {
        if (result && currentOnConfirm.value) {
            currentOnConfirm.value(); 
        } else if (!result && currentOnCancel.value) {
            currentOnCancel.value();
        }
        hideConfirm();
    };

    return {
        currentConfirm, 
        showConfirm,
        hideConfirm,
        handleConfirmAction,
    };
};
```

### 2. `GlobalConfirm.vue`: Teleport ile Her Yerdeki Dialog

Asıl sihir burada başlıyor! `GlobalConfirm.vue` bileşeni, Vue'nun **Teleport** özelliğini kullanarak onay dialogunu DOM'da istediğimiz bir yere taşıyor. Genellikle `body` etiketinin en sonuna taşıyarak, z-index çakışmaları gibi sorunları önlüyor ve dialogun her zaman diğer elemanların üzerinde görünmesini sağlıyor.

```html
<template>
    <teleport to="body">
        <transition name="dialog-fade">
            <div 
                v-if="currentConfirm" 
                class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
                @click.self="handleAction(false)"
            >
                <div class="bg-white rounded-lg shadow-xl w-[90%] max-w-md p-6 m-4">
                    <div v-if="currentConfirm.title" class="mb-4">
                        <h3 class="text-lg font-semibold">
                            {{ currentConfirm.title }}
                        </h3>
                    </div>
                    
                    <div class="mb-6">
                        <p class="text-gray-700 text-base">{{ currentConfirm.message }}</p>
                    </div>
                    
                    <div class="flex justify-end gap-3">
                        <button 
                            type="button"
                            :class="[defaultCancelButtonClass, currentConfirm.cancelButtonClass]"
                            @click="handleAction(false)"
                        >
                            {{ currentConfirm.cancelButtonText }}
                        </button>
                        <button 
                            type="button"
                            :class="[defaultConfirmButtonClass, currentConfirm.confirmButtonClass]"
                            @click="handleAction(true)"
                        >
                            {{ currentConfirm.confirmButtonText }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useConfirm } from './useConfirm';

const { currentConfirm, handleConfirmAction } = useConfirm();

const defaultCancelButtonClass = computed(() => 
    'px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors'
);

const defaultConfirmButtonClass = computed(() => 
    'px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
);

const handleAction = (result: boolean): void => {
    handleConfirmAction(result);
};
</script>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
    transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
    opacity: 0;
}

.dialog-fade-enter-active .bg-white,
.dialog-fade-leave-active .bg-white {
    transition: transform 0.3s ease, opacity 0.3s ease;
}

.dialog-fade-enter-from .bg-white,
.dialog-fade-leave-to .bg-white {
    transform: scale(0.9);
    opacity: 0;
}
</style>
```

### 3. Dialogu Uygulamaya Ekleme ve Kullanım

Artık tek yapmanız gereken, `GlobalConfirm.vue` bileşenini uygulamanızın ana bileşeninde (örneğin `App.vue`'da) bir kez eklemek. Daha sonra istediğiniz herhangi bir bileşenden `useConfirm` composables'ını import ederek `showConfirm` fonksiyonunu çağırabilirsiniz.

```html
<template>
    <button @click="handleShowConfirm">Onay Dialogu Göster</button>
</template>

<script setup lang="ts">
import { useConfirm } from './useConfirm';

const { showConfirm } = useConfirm();

const handleShowConfirm = (): void => {
    showConfirm({
        title: 'Onay Gerekiyor',
        message: 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
        confirmButtonText: 'Onayla',
        cancelButtonText: 'İptal Et',
        onConfirm: () => {
            console.log('Onaylandı');
        },
        onCancel: () => {
            console.log('İptal Edildi');
        },
    });
};
</script>
```

App.vue dosyasında eklenen kodlar

```html
<template>
    <ConfirmDialog /> 
    <div id="app-container">
        <h1>Global Confirm Dialog System</h1>
        <p>Click the buttons below to trigger the confirm dialog.</p>
        <MyComponent /> 
    </div>
</template>

<script setup lang="ts">
import ConfirmDialog from './components/GlobalConfirm.vue';
import MyComponent from './components/MyComponent.vue';
</script>
```

---

## Bu Yaklaşımın Avantajları

* **Kod Tekrarını Önler:** Her bir onay dialogunu ayrı ayrı yazmaktan kurtuluruz. Tek bir merkezi dialog, uygulamanın her yerinde yeniden kullanılır.
* **Merkezi Yönetim:** Dialogun görünümü, davranışı ve mantığı tek bir yerden yönetilir. Bu sayede, gelecekteki değişiklikler çok daha kolay ve hızlı bir şekilde yapılabilir.
* **Kolay Özelleştirme:** `showConfirm` fonksiyonuna gönderdiğimiz `options` objesi sayesinde, her çağrıda dialogun başlığını, mesajını, buton metinlerini ve hatta özel CSS sınıflarını bile kolayca özelleştirebiliriz.
* **Bakım Kolaylığı:** Kodun daha düzenli ve modüler olması, hata ayıklama ve bakım süreçlerini büyük ölçüde basitleştirir.
* **Performans:** DOM'a fazladan birçok dialog bileşeni eklemek yerine, tek bir bileşenin varlığı performansa da olumlu etki eder.
* **Erişilebilirlik ve Kullanıcı Deneyimi:** Teleport sayesinde dialogun doğru DOM konumunda olması, ekran okuyucular ve klavye navigasyonu gibi erişilebilirlik özelliklerini de kolaylaştırır ve daha tutarlı bir kullanıcı deneyimi sunar.

Bu basit ama güçlü yapı, Vue.js ve React uygulamalarınında onay dialoglarının daha kolay yönetilmesini sağlayacaktır.

Kendimce günlük hayatımda karşılaştığım bir soruna böyle bir çözüm buldum.
Okuduğunuz için teşekkür ederim. Umarım faydalı olur.👋👋







