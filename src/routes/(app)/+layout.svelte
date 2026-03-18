<script lang="ts">
	import PageHeader from '$lib/PageHeader.svelte';
	import ProfileCard from '$lib/ProfileCard.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import '../layout.css';

	let { children, data } = $props();
</script>

<svelte:head><link rel="icon" href="/favicon.ico" /></svelte:head>
{@render children()}
<img src="/dashboard/dots-tl.png" alt="dots" class="fixed top-0 left-0 -z-10 w-2/3" />
<img src="/dashboard/dots-br.png" alt="dots" class="fixed right-0 bottom-0 -z-10 w-3/5" />
<Sidebar />
<ProfileCard user={data.user} />
