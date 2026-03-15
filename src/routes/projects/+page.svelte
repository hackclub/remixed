<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CDProject from '$lib/CDProject.svelte';
	import CassetteProject from '$lib/CassetteProject.svelte';
	import { onMount } from 'svelte';
	import { styleButton, styleH1 } from '$lib/styles';

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
<div class="p-10 pl-40">
	<div class="mb-6 flex items-center justify-center gap-8">
		<h1 class="{styleH1} text-text">Projects</h1>
		<a href="/projects/new" class="{styleButton}  bg-primary">+ New</a>
	</div>

	{#if userProjects.length > 0}
		<div class="flex w-full flex-wrap justify-center gap-6">
			{#each userProjects as project}
				<CDProject {project} />
			{/each}
		</div>
	{:else}
		<p class="text-center font-gothic text-xl text-text">Get started by creating a project!</p>
	{/if}
</div>
