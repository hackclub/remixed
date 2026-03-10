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
	<div class="mb-6 flex items-center gap-4">
		<h1 class="text-2xl font-bold">Your Projects</h1>
		<a href="/projects/new">New</a>
	</div>

	<div class="flex flex-wrap gap-6">
		{#each userProjects as project}
			<div class="relative">
				<img src="/cassette.png" alt="cassette" />
				<div
					class="absolute top-10 left-1/2 flex h-14 w-80 -translate-x-1/2 items-center justify-center"
				>
					<h1 class="line-clamp-2 text-center font-gothic text-2xl leading-tight">
						{project.title}
					</h1>
				</div>
				<p
					class="absolute top-46 left-1/2 line-clamp-2 w-84 -translate-x-1/2 font-zcool text-xs leading-5"
				>
					{project.description}
				</p>
			</div>
		{/each}
	</div>
</div>
