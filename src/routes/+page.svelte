<script lang="ts">
	let records = $state(['RHYTHM GAMES', 'THE SECOND ONE', 'THE THIRd ONE']);
	console.log('FUCK');
</script>

<div class="flex w-screen justify-center mt-16 relative">
	{#each records as record, i}
		<div
			class="absolute h-[400px] w-[400px] rounded-full border border-blue-500 bg-red-500"
			style="top: {i * 60}px; z-index: {i}"
		>
		</div>
	{/each}
</div>
