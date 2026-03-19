<script lang="ts">
	import PageHeader from '$lib/PageHeader.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import { onMount } from 'svelte';

	let projectList: any[] = $state([]);
	let waterfall: HTMLElement | null = $state(null);

	function waterfallScrolled(e: Event) {
		const elem: HTMLDivElement = e.target as HTMLDivElement;
		const atBottom = Math.abs(elem.scrollHeight - elem.clientHeight - elem.scrollTop) <= 10;
		console.log(atBottom);
	}

	onMount(() => {
		fetch('api/project_list')
			.then((resp) => resp.json())
			.then((resp) => (projectList = resp));
	});
</script>

<PageHeader title="Gallery" desc="Look at what other peeps have made!" />

<div onscroll={waterfallScrolled} class="h-screen w-screen overflow-y-auto">
	{#each projectList as proj}
		<div>
			<ProjectCard {proj} />
		</div>
	{/each}
</div>
