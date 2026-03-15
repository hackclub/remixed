<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CDProject from '$lib/CDProject.svelte';
	import CassetteProject from '$lib/CassetteProject.svelte';
	import { onMount } from 'svelte';
	import { styleButton } from '$lib/styles';

	let userProjects = $state([]);

	onMount(() => {
		try {
			const cached = localStorage.getItem('userProjects');
			if (cached) userProjects = JSON.parse(cached);
		} catch {
			localStorage.removeItem('userProjects');
		}

		fetch('/api/projects')
			.then((r) => r.json())
			.then((data) => {
				userProjects = data;
				localStorage.setItem('userProjects', JSON.stringify(data));
			});
	});
</script>

<Sidebar />
<div class="ml-32 p-8">
	<div class="mb-6 flex items-center justify-center gap-8">
		<h1 class="font-nikkyou text-3xl font-bold text-text">Projects</h1>
		<a href="/projects/new" class="{styleButton}  bg-primary">+ New</a>
	</div>

	<div class="flex w-full flex-wrap justify-center gap-6">
		{#each userProjects as project}
			<CDProject {project} />
		{/each}
	</div>
</div>
