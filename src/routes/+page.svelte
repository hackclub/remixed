<script lang="ts">
	let records = $state(['RHYTHM GAMES', 'THE SECOND ONE', 'THE THIRd ONE', 'fourth']);
	let selectedIndex: number | null = $state(null);
	const expandAmount = 300;

	function getRecordTop(i: number) {
		return i * 60 + (selectedIndex !== null && i > selectedIndex ? expandAmount : 0);
	}

	function getSleeveTop() {
		return records.length * 60 + (selectedIndex !== null ? expandAmount : 0);
	}
</script>

<div class="relative mt-16 flex w-screen justify-center">
	{#each records as record, i}
		<button
			class="absolute w-200 h-200 rounded-full border border-blue-500 bg-red-500 flex items-start justify-center pt-4 cursor-pointer transition-all"
			style="top: {getRecordTop(i)}px; z-index: {i}"
			onclick={() => selectedIndex = selectedIndex === i ? null : i}
		>
			<h1 class="text-white">{record}</h1>
		</button>
	{/each}

	<div
		class="absolute w-200 bg-stone-800 rounded-b-sm z-50 h-200 transition-all "
		style="top: {getSleeveTop()}px"
	></div>
</div>
