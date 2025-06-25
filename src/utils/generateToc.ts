import type { MarkdownHeading } from 'astro'

export interface TocItem extends MarkdownHeading {
	subheadings: Array<TocItem>
}

function diveChildren(item: TocItem, depth: number): Array<TocItem> {
	if (depth === 1 || !item?.subheadings?.length) {
		return item?.subheadings
	} else {
		// e.g., 2
		return diveChildren(item?.subheadings?.[item?.subheadings?.length - 1] as TocItem, depth - 1)
	}
}

export function generateToc(headings: ReadonlyArray<MarkdownHeading>) {
	// this ignores/filters out h1 element(s)
	const bodyHeadings = [...headings.filter(({ depth }) => depth > 1)]
	const toc: Array<TocItem> = []

	if (bodyHeadings.length === 0) {
		return toc
	}

	// Find the minimum depth to use as the base level
	const minDepth = Math.min(...bodyHeadings.map(h => h.depth))

	bodyHeadings.forEach((h) => {
		const heading: TocItem = { ...h, subheadings: [] }

		// Add elements at the minimum depth level into the top level
		if (heading?.depth === minDepth) {
			toc.push(heading)
		} else {
			const lastItemInToc = toc[toc.length - 1]
			
			// Check if we have a parent item in toc
			if (!lastItemInToc) {
				// If no parent exists, add to top level
				toc.push(heading)
				return
			}

			if (heading?.depth < lastItemInToc?.depth) {
				throw new Error(`Orphan heading found: ${heading.text}.`)
			}

			// higher depth
			// push into children, or children's children
			const gap = heading?.depth - lastItemInToc?.depth
			const target = diveChildren(lastItemInToc, gap)
			
			// Check if target exists before pushing
			if (target) {
				target.push(heading)
			} else {
				// If target is undefined, add to top level
				toc.push(heading)
			}
		}
	})
	return toc
}
