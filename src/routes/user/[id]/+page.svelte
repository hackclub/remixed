<script lang="ts">
	import CDProject from '$lib/CDProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />
<div class=" pt-10 pr-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">{data.user.username}</h1>

	{#if data.user.roles.includes('STAFF')}
		<div class="mx-auto max-w-80 rounded-md bg-accent-red p-2 shadow-md">
			<img src={data.user.avatarUrl} alt="profile" class="rounded-md" />
			<p class="text-center font-gothic tracking-wider text-text">Remixed Staff</p>
		</div>
	{:else}
		<div class="mx-auto max-w-80">
			<img src={data.user.avatarUrl} alt="profile" class="rounded-md" />
		</div>
	{/if}

	<h2 class="{styleH2} mt-12 mb-4 text-text">Projects</h2>
	<div class="flex h-full flex-row flex-wrap justify-center gap-8">
		{#each data.userProjects as project}
			<CDProject {project} />
		{/each}
	</div>
</div>
