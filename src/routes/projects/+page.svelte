<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CassetteProject from '$lib/CassetteProject.svelte';
	import { onMount } from 'svelte';

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
		<h1 class="font-nikkyou text-3xl font-bold text-primary">Projects</h1>
		<a href="/projects/new" class="rounded-md bg-primary px-4 py-2 text-lg text-accent">+ New</a>
	</div>

	<div class="flex w-full flex-wrap justify-center gap-6">
		{#each userProjects as project}
			<CassetteProject {project} />
		{/each}
	</div>
</div>
