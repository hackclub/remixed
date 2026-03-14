<script lang="ts">
	import CoverArt from '$lib/CoverArt.svelte';
	let { project } = $props();

	// let rotate = $state([0.0, 0.0]);

	// function handleMouseMove(e: MouseEvent) {
	// 	const mult = 60.0;
	// 	const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
	// 	const pos = [e.clientX - rect.left, e.clientY - rect.top];
	// 	rotate = [(pos[1] / rect.height - 0.5) * -mult, (pos[0] / rect.width - 0.5) * -mult];
	// 	console.log(rotate[0], rotate[1]);
	// }
</script>

<a
	href="/projects/{project.id}"
	class="relative size-80 min-h-80 origin-center overflow-hidden shadow-md transition perspective-[200px] hover:scale-105 hover:shadow-xl"
>
	<CoverArt class="absolute -z-1 " src={project.coverArt} />
	<div class="absolute top-2/3 left-1/2 w-90 -translate-1/2 -rotate-12 bg-primary">
		<h1 class="mx-auto max-w-80 text-center font-gothic text-3xl text-accent">
			{project.title}
		</h1>
	</div>
</a>
