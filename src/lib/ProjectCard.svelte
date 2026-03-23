<script lang="ts">
	import CoverArt from '$lib/CoverArt.svelte';
	import { styleInteractiveCard } from '$lib/styles';

	let { proj } = $props();
</script>

<a
	href="/projects/{proj.id}"
	class="{styleInteractiveCard} block w-72 snap-center break-inside-avoid p-4 px-6 h-full"
>
	<CoverArt
		src={proj.coverArt}
		class="mb-4 h-30 w-full rounded-xl border-4 border-[#E2BEFF] object-cover"
	/>
	<div class="flex grow flex-col justify-end">
		<h2 class=" line-clamp-1 font-jua text-3xl text-[#E2BEFF] text-shadow-flat">
			{proj.title}
		</h2>
		<p class="line-clamp-3 font-jua text-[#E2BEFF]">{proj.description}</p>
	</div>
</a>
