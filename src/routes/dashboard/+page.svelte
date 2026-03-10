<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
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

<Sidebar />
<div class="ml-40 text-text">
	{#if userProfile}
		<pre>
		<p>{JSON.stringify(userProfile, null, 2)}</p>
		</pre>
	{/if}
</div>
