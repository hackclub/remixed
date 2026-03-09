<script lang="ts">
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

<h1>LIST YOUR PROJECTS</h1>
{#if userProjects}
	<pre>
		<p>{JSON.stringify(userProjects, null, 2)}</p>
	</pre>
{/if}
