<script lang="ts">
	import { shuffleArray } from '$lib';
	import PageHeader from '$lib/PageHeader.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import { onMount } from 'svelte';

	let projectList: any[] = $state([]);
	let waterfall: HTMLElement | null = $state(null);

	function waterfallScrolled(e: Event) {
		const elem: HTMLDivElement = e.target as HTMLDivElement;
		const atBottom = Math.abs(elem.scrollHeight - elem.clientHeight - elem.scrollTop) <= 10;
	}

	onMount(() => {
		fetch('api/project_list')
			.then((resp) => resp.json())
			.then((resp) => addProjects(resp));
	});

	function addProjects(list: any[]) {
		list = shuffleArray(list);
		for (const proj of list) {
			projectList.push({
				height: Math.random() * 200.0 + 300.0,
				x: Math.random() * 100.0 - 50.0,
				y: Math.random() * 50.0 - 25.0,
				rot: Math.random() * 20.0 - 10.0,
				...proj,
			});
		}
	}
</script>

<PageHeader title="Gallery" desc="Look at what other peeps have made!" />

<div onscroll={waterfallScrolled} class="h-screen w-screen overflow-y-auto pt-48">
	<div class="px-32 [column-count:3]">
		{#each projectList as proj}
			<div
				class="relative flex items-center hover:z-10"
				style="
					height: {proj.height}px; 
					left: {proj.x}px;
					top: {proj.y}px;
					rotate: {proj.rot}deg;
					
				"
			>
				<ProjectCard {proj} />
			</div>
		{/each}
	</div>
</div>
