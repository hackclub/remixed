<script lang="ts">
	import PageHeader from '$lib/PageHeader.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import { onMount } from 'svelte';

	let projectList: any[] = $state([]);

	onMount(() => {
		fetch('/api/project_list')
			.then((resp) => resp.json())
			.then((resp) => (projectList = resp));
	});
</script>

<svelte:head>
	<title>Gallery - Remixed</title>
</svelte:head>

<PageHeader title="Gallery" subtitle="Look at what other peeps have made!" />

<div class="h-screen w-screen">
	<div
		class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] justify-items-center gap-8 px-6 pt-56 pb-40 sm:px-10 lg:px-16"
	>
		{#each projectList as proj}
			<ProjectCard {proj} />
		{/each}
	</div>
</div>
