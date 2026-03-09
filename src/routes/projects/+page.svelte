<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';

	let userProjects = $state(null);

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
				localStorage.setItem('userProfile', JSON.stringify(data));
			});
	});
</script>

<Sidebar />
<div class="ml-40">
	<h1>LIST YOUR PROJECTS</h1>
	<a href="/projects/new">Create New</a>
	{#if userProjects}
		<pre>
		<p>{JSON.stringify(userProjects, null, 2)}</p>
	</pre>
	{/if}
</div>
