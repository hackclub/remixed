<script lang="ts">
	import BoldText from './BoldText.svelte';

	let {
		img,
		h2,
		h1,
		class: className = '',
		style: styleName = '',
		normalizeImage = false,
	} = $props();
</script>

<div
	style={styleName}
	class="{className} w-max min-w-50 rounded-2xl bg-linear-to-br from-secondary to-[#53C1D7] p-1 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.05,0,0,1)]"
>
	<div class="relative flex flex-col justify-center rounded-xl bg-text p-4 pt-20">
		{#if normalizeImage}
			<div
				class="pointer-events-none absolute -top-20 left-1/2 flex h-36 w-[78%] -translate-x-1/2 items-end justify-center"
			>
				<img src={img} alt="crunch" class="h-full w-full object-contain object-bottom" />
			</div>
		{:else}
			<img
				src={img}
				alt="crunch"
				class="pointer-events-none absolute -top-2/3 left-0 w-full origin-bottom"
			/>
		{/if}
		<BoldText class="text-md mx-auto flex! font-jua">{h2}</BoldText>
		<BoldText class="mx-auto flex! font-jua text-2xl">{h1}</BoldText>
	</div>
</div>
