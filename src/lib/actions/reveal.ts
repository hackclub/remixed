/**
 * Svelte action that splits all text nodes within an element into per-word
 * spans and reveals them with a staggered opacity + translateY animation
 * when the element scrolls into view.
 */
export function wordReveal(node: HTMLElement) {
	let wordIndex = 0;

	function processNode(el: Node): void {
		const childNodes = [...el.childNodes];
		for (const child of childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				const text = child.textContent || '';
				if (!text.trim()) continue;

				const parts = text.split(/(\s+)/);
				const fragment = document.createDocumentFragment();

				for (const part of parts) {
					if (/^\s+$/.test(part)) {
						fragment.appendChild(document.createTextNode(part));
					} else if (part) {
						const span = document.createElement('span');
						span.className = 'word-reveal';
						span.style.setProperty('--word-i', String(wordIndex++));
						span.textContent = part;
						fragment.appendChild(span);
					}
				}

				child.replaceWith(fragment);
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				const el = child as HTMLElement;
				if (el.hasAttribute('data-bold-text')) {
					// Treat the whole BoldText as one word unit to avoid desyncing
					// its internal stroke/gradient duplicate renders.
					const span = document.createElement('span');
					span.className = 'word-reveal';
					span.style.setProperty('--word-i', String(wordIndex++));
					el.replaceWith(span);
					span.appendChild(el);
				} else {
					processNode(child);
				}
			}
		}
	}

	processNode(node);

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				node.querySelectorAll('.word-reveal').forEach((el) => el.classList.add('revealed'));
				observer.disconnect();
			}
		},
		{ threshold: 0.1 }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}

/**
 * Svelte action that animates the element in with an opacity + translateY
 * transition when it scrolls into view. Pass an index to stagger multiple
 * sibling elements.
 */
export function blockReveal(node: HTMLElement, index: number = 0) {
	node.classList.add('block-reveal');
	node.style.setProperty('--block-i', String(index));

	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				node.classList.add('revealed');
				observer.disconnect();
			}
		},
		{ threshold: 0.1 }
	);

	observer.observe(node);

	return {
		update(newIndex: number) {
			node.style.setProperty('--block-i', String(newIndex));
		},
		destroy() {
			observer.disconnect();
		}
	};
}
