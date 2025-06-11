---
title: "Global Confirm Dialog"
description: "An approach to managing confirm dialogs in Vue.js (and React)"
publishDate: "11 June 2025"
tags: ["vue", "javascript"]
lang: "en"
---

# Managing Confirm Dialogs in Vue.js

When developing projects with Vue and React, we use confirmation dialogs in many places. Most of these dialogs work and look the same. We use them by importing the same component and defining the same states on every page. I realize how tedious and inefficient this approach is when I revisit the code. In this article, I tried to find a solution to this problem with a single state and a single central dialog.

---

## Reusable Confirm Dialog with Global State and Teleport

To overcome this inefficiency, I created a single, application-wide confirmation dialog using **Vue's global state mechanism** and the **Teleport** feature. This way, no matter which component we are in, we can easily call and customize the confirmation dialog through a central system.

Here are the basic steps on how I solved this problem:

### 1. The `useConfirm` Composable: The Heart of the Confirmation Logic

First, I created a **composable** (`useConfirm.ts`) to manage the logic of the confirmation dialog. This file contains reactive variables (`ref`) that control the dialog's visibility, title, message, and button texts. It also manages the callback functions (`onConfirm`, `onCancel`) that will run on confirmation or cancellation.

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
            title: options.title || 'Confirmation',
            confirmButtonText: options.confirmButtonText || 'Confirm',
            cancelButtonText: options.cancelButtonText || 'Cancel',
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

### 2. `GlobalConfirm.vue`: The Everywhere Dialog with Teleport

The real magic starts here! The `GlobalConfirm.vue` component uses Vue's **Teleport** feature to move the confirmation dialog to any place we want in the DOM. By usually moving it to the end of the `body` tag, it prevents issues like z-index conflicts and ensures the dialog always appears on top of other elements.

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

### 3. Adding and Using the Dialog in the Application

Now, all you have to do is add the `GlobalConfirm.vue` component once in your application's main component (e.g., `App.vue`). Then, from any component you want, you can import the `useConfirm` composable and call the `showConfirm` function.

```html
<template>
    <button @click="handleShowConfirm">Show Confirm Dialog</button>
</template>

<script setup lang="ts">
import { useConfirm } from './useConfirm';

const { showConfirm } = useConfirm();

const handleShowConfirm = (): void => {
    showConfirm({
        title: 'Confirmation Required',
        message: 'Are you sure you want to perform this action?',
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        onConfirm: () => {
            console.log('Confirmed');
        },
        onCancel: () => {
            console.log('Cancelled');
        },
    });
};
</script>
```

Code added to `App.vue` file

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

## Advantages of This Approach

* **Prevents Code Repetition:** We avoid writing each confirmation dialog separately. A single, central dialog is reused throughout the application.
* **Centralized Management:** The dialog's appearance, behavior, and logic are managed from a single place. This makes future changes much easier and faster to implement.
* **Easy Customization:** Thanks to the `options` object we send to the `showConfirm` function, we can easily customize the dialog's title, message, button texts, and even custom CSS classes for each call.
* **Ease of Maintenance:** Having cleaner and more modular code greatly simplifies debugging and maintenance processes.
* **Performance:** Instead of adding many extra dialog components to the DOM, the presence of a single component has a positive impact on performance.
* **Accessibility and User Experience:** Thanks to Teleport, having the dialog in the correct DOM position also facilitates accessibility features like screen readers and keyboard navigation, and provides a more consistent user experience.

This simple yet powerful structure will make managing confirmation dialogs in Vue.js and React applications easier.

I found such a solution to a problem I encounter in my daily life.
Thank you for reading. I hope it is useful.👋👋







