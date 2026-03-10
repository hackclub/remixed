<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Sidebar />
<div class="ml-40">
	{JSON.stringify(data)}
</div>
