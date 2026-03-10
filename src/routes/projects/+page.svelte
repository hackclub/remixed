<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
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
<div class="ml-40 p-8">
	<div class="mb-6 flex items-center gap-8">
		<h1 class="font-nikkyou text-3xl font-bold text-primary">Projects</h1>
		<a href="/projects/new" class="rounded-md bg-primary px-4 py-2 text-lg text-accent">+ New</a>
	</div>

	<div class="flex flex-wrap gap-6">
		{#each userProjects as project}
			<a class="relative transition hover:scale-105" href="/projects/{project.id}">
				<img src="/cassette.png" alt="cassette" />
				<div
					class="absolute top-10 left-1/2 flex h-14 w-80 -translate-x-1/2 items-center justify-center"
				>
					<h1 class="line-clamp-2 text-center font-gothic text-2xl leading-tight text-text">
						{project.title}
					</h1>
				</div>
				<p
					class="absolute top-46 left-1/2 line-clamp-2 w-84 -translate-x-1/2 font-zcool text-xs leading-5"
				>
					{project.description}
				</p>
			</a>
		{/each}
	</div>
</div>
