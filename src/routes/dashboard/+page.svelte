<script lang="ts">
	import { onMount } from 'svelte';
	let userProfile = $state(null);

	onMount(() => {
		try {
			const cached = localStorage.getItem('userProfile');
			if (cached) userProfile = JSON.parse(cached);
		} catch {
			localStorage.removeItem('userProfile');
		}

		fetch('/api/me')
			.then((r) => r.json())
			.then((data) => {
				userProfile = data;
				localStorage.setItem('userProfile', JSON.stringify(data));
			});
	});
</script>

<h1>dashboard</h1>
{#if userProfile}
	<pre>
		<p>{JSON.stringify(userProfile, null, 2)}</p>
	</pre>
{/if}
