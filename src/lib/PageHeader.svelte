<script>
	import { onMount } from 'svelte';
	import BoldText from './BoldText.svelte';
	import { fly } from 'svelte/transition';

	let start = $state(false);

	let {
		titleRich = null,
		subtitleRich = null,
		under = null,
		description = null,
		subtitle = '',
		title = '',
		full = false,
	} = $props();

	onMount(() => (start = true));
</script>

{#if start}
	{#if under}
		<div
			style="width: {full ? 105 : 60}%;"
			class="absolute top-52 right-8 z-21 -rotate-4 overflow-y-clip p-4 font-jua"
			transition:fly={{ x: -200 }}
		>
			{@render under()}
		</div>
	{/if}
	<div
		style="width: {full ? 105 : 60}%;"
		class="absolute top-16 -left-8 z-20 -rotate-4 overflow-y-clip bg-text p-4 pl-12 font-jua"
		transition:fly={{ x: -200 }}
	>
		<div
			class="absolute top-0 right-0 z-4 h-full w-24 origin-bottom-right scale-y-110 rotate-24 bg-text"
		></div>
		<div class="relative z-5 flex w-screen justify-between pl-12">
			<div>
				{#if titleRich}
					{@render titleRich()}
				{:else}
					<BoldText class="text-5xl" stroke="2">{title}</BoldText>
				{/if}
				<p class="text-xl text-light">
					{#if subtitleRich}
						{@render subtitleRich()}
					{:else}
						{subtitle}
					{/if}
				</p>
			</div>

			{#if description}
				<div
					class="absolute right-8 h-full w-md overflow-y-auto text-right font-jua text-lg text-light"
				>
					{@render description()}
				</div>
			{/if}
		</div>
	</div>
	<div
		style="width: {full ? 105 : 60}%; top: {full ? 7 : 5}rem"
		class="relative -left-4 z-19 -rotate-4 overflow-y-clip bg-[#083F91] p-4 pl-12 font-jua"
		transition:fly={{ x: -200, delay: 50 }}
	>
		<div
			class="absolute top-0 right-0 z-4 h-full w-24 origin-bottom-right scale-y-110 rotate-24 bg-[#083F91]"
		></div>
		<div class="invisible relative z-5 select-none">
			<BoldText class="text-5xl" stroke="2">{title}</BoldText>
			<p class="text-xl text-light">{subtitle}</p>
		</div>
	</div>
{/if}
