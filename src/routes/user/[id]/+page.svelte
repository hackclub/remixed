<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';

	let { data } = $props();
</script>

<Sidebar />
<div class="flex h-screen items-center justify-center pr-10 pl-40">
	<div class="w-80">
		<h1 class="text-center font-nikkyou text-3xl font-bold text-primary">{data.user.username}</h1>
		<img src={data.user.avatarUrl} alt="profile" class="rounded-md" />
	</div>
	<div>
		{#each data.userProjects as project}
			{project.title}
		{/each}
	</div>
</div>
