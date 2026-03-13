<script lang="ts">
	import CDProject from '$lib/CDProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';

	let { data } = $props();
</script>

<Sidebar />
<div class="flex h-screen justify-evenly pt-10 pr-10 pl-40">
	<div class="w-80">
		<h1 class="text-center font-nikkyou text-3xl font-bold text-primary">{data.user.username}</h1>
		<img src={data.user.avatarUrl} alt="profile" class="rounded-md" />
	</div>
	<div class="flex h-full flex-col gap-8">
		{#each data.userProjects as project}
			<CDProject {project} />
		{/each}
	</div>
</div>
