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

<div class="h-screen w-screen overflow-y-auto pt-28">
	{#if projectList.length === 0}
		<div class="mx-auto max-w-4xl px-6 pt-28 pb-40 text-center sm:px-10 lg:px-16 h-[90vh] flex justify-center items-center">
			<p class="font-jua text-3xl text-text">No projects yet! Go ship the first one!</p>
		</div>
	{:else}
		<div
			class="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] justify-items-center gap-8 px-6 pt-28 pb-40 sm:px-10 lg:px-16"
		>
			{#each projectList as proj}
				<ProjectCard {proj} />
			{/each}
		</div>
	{/if}
</div>
