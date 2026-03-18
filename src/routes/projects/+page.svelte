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

<img src="/dashboard/dots-tl.png" alt="dots" class="fixed top-0 left-0 w-2/3" />
<img src="/dashboard/dots-br.png" alt="dots" class="fixed right-0 bottom-0 w-3/5" />
