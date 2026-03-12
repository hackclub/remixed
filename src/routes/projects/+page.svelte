<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CoverArt from '$lib/CoverArt.svelte';
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
			<a
				href="/projects/{project.id}"
				class="relative size-80 overflow-hidden shadow-md transition hover:scale-105 hover:shadow-xl"
			>
				<CoverArt class="absolute -z-1 " src={project.coverArt} />
				<div class="absolute top-2/3 left-1/2 w-90 -translate-1/2 -rotate-12 bg-primary">
					<h1 class="mx-auto max-w-80 text-center font-gothic text-3xl text-accent">
						{project.title}
					</h1>
				</div>
			</a>
		{/each}
	</div>
</div>
