<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import type { PageProps } from './$types';

	let hoursText = $state('');
	let { data }: PageProps = $props();

	function formatHoursText() {
		if (data.hackatimeSeconds == null) return;
		const minutes = data.hackatimeSeconds! / 60.0;
		const hours = Math.floor(minutes / 60.0);
		const minuteTextRaw = String(minutes - hours * 60);
		const minuteText = minuteTextRaw.slice(0, minuteTextRaw.indexOf('.'));
		hoursText = `${hours}h ${minuteText}m`;
	}

	formatHoursText();
</script>

<Sidebar />
<div class="mt-8 mr-8 ml-40">
	<div class="flex flex-row justify-center gap-8">
		<!-- TODO: make the cover art like balatro or smth -->
		<div class="">
			<img src="/gup.webp" alt="cover art" class="mb-4 aspect-square h-80 w-80 object-cover" />
			<p class="text-center font-gothic text-xl text-primary">{hoursText}</p>
			<p class="text-center font-gothic text-sm text-secondary italic">
				{data.project?.category.replaceAll('_', ' ')}
			</p>
		</div>
		<div class="w-80">
			<h1 class="mb-8 text-center font-nikkyou text-5xl text-primary">{data.project?.title}</h1>
			{#if data.project?.description!.trim().length != 0}
				<p class="font-zcool text-text">{data.project?.description}</p>
			{:else}
				<p class="text-center font-zcool text-xl text-secondary">No Description Provided</p>
			{/if}
		</div>
	</div>
</div>
