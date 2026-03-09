<script lang="ts">
	let records = $state(['RHYTHM GAMES', 'THE SECOND ONE', 'THE THIRd ONE', 'fourth']);
	console.log('FUCK');
</script>

<div
	class="relative mt-16 flex w-screen justify-center"
>
	{#each records as record, i}
		<div
			class="absolute w-200 h-200 rounded-full border border-blue-500 bg-red-500 flex items-start justify-center pt-4"
			style="top: {i * 60}px; z-index: {i}"
		>
			<h1 class="text-white">{record}</h1>
		</div>
	{/each}

	<div
		class="absolute w-200 bg-stone-800 rounded-b-sm z-50 h-200 top-60"
	></div>
</div>
