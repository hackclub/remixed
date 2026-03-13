<script lang="ts">
	import CoverArt from '$lib/CoverArt.svelte';
	let { project } = $props();
</script>

<a
	href="/projects/{project.id}"
	class="relative size-80 min-h-80 overflow-hidden shadow-md transition hover:scale-105 hover:shadow-xl"
>
	<CoverArt class="absolute -z-1 " src={project.coverArt} />
	<div class="absolute top-2/3 left-1/2 w-90 -translate-1/2 -rotate-12 bg-primary">
		<h1 class="mx-auto max-w-80 text-center font-gothic text-3xl text-accent">
			{project.title}
		</h1>
	</div>
</a>
