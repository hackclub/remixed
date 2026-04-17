<script lang="ts">
	import BoldText from './BoldText.svelte';
	import { onMount } from 'svelte';

	let { text, stroke = '2', class: className = '', style: styleName = '' }: {
		text: string;
		stroke?: string;
		class?: string;
		style?: string;
	} = $props();

	const words = text.trim().split(/\s+/);

	let container: HTMLElement;
	let visible = $state(false);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					visible = true;
					observer.disconnect();
				}
			},
			{ threshold: 0.1 }
		);
		observer.observe(container);
		return () => observer.disconnect();
	});
</script>

<span bind:this={container} class="inline-flex flex-wrap gap-x-[0.3em] {className}" style={styleName}>
	{#each words as word, i}
		<span
			class="word-reveal"
			class:revealed={visible}
			style="--word-i: {i}"
		><BoldText {stroke}>{word}</BoldText></span>
	{/each}
</span>
