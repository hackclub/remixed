<script lang="ts">
	let records = $state([
		{ title: 'GAME', desc: 'make a fucking rhythm game' },
		{ title: 'WEBSITE', desc: 'make a fucking website' },
		{ title: 'MUSIC', desc: 'make some fucking beats' },
		{ title: 'OTHER', desc: 'anything else related to music' }
	]);
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
			class="absolute flex h-200 w-200 cursor-pointer flex-col items-center gap-16 rounded-full border border-blue-500 bg-red-500 pt-4 transition-all"
			style="top: {getRecordTop(i)}px; z-index: {i}"
			onclick={() => (selectedIndex = selectedIndex === i ? null : i)}
		>
			<h1 class="text-white">{record.title}</h1>
			<p>{record.desc}</p>
		</button>
	{/each}

	<div
		class="absolute z-50 h-200 w-200 rounded-b-sm bg-stone-800 text-center text-white transition-all"
		style="top: {getSleeveTop()}px"
	>
		<h1 class="m-16 text-5xl italic">Remixed</h1>
		<p>
			turn your music taste into a website, create a rhythm game, or ship a music related project!!
			💖
		</p>
	</div>
</div>
