<script>
	import { onMount } from 'svelte';
	import BoldText from './BoldText.svelte';
	import { fly } from 'svelte/transition';

	let start = $state(false);

	let { title, desc } = $props();

	onMount(() => (start = true));
</script>

{#if start}
	<div
		class="fixed top-16 -left-8 z-20 w-3/5 -rotate-4 overflow-y-clip bg-text p-4 pl-12 font-jua"
		transition:fly={{ x: -200 }}
	>
		<div
			class="absolute top-0 right-0 z-4 h-full w-24 origin-bottom-right scale-y-110 rotate-24 bg-text"
		></div>
		<div class="relative z-5">
			<BoldText class="text-5xl" stroke="2">{title}</BoldText>
			<p class="text-xl text-light">{desc}</p>
		</div>
	</div>
	<div
		class="fixed top-20 -left-4 z-19 w-3/5 -rotate-4 overflow-y-clip bg-[#083F91] p-4 pl-12 font-jua"
		transition:fly={{ x: -200, delay: 50 }}
	>
		<div
			class="absolute top-0 right-0 z-4 h-full w-24 origin-bottom-right scale-y-110 rotate-24 bg-[#083F91]"
		></div>
		<div class="invisible relative z-5 select-none">
			<BoldText class="text-5xl" stroke="2">{title}</BoldText>
			<p class="text-xl text-light">{desc}</p>
		</div>
	</div>
{/if}
