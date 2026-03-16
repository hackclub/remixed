<script lang="ts">
	import CDProject from '$lib/CDProject.svelte';
	import CoverArt from '$lib/CoverArt.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />
<div class="p-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">{data.user!.username}</h1>

	{#if data.user!.roles.includes('STAFF')}
		<div
			class="relative top-0 mx-auto max-w-80 bg-text text-text shadow-button transition-all hover:-top-1 hover:shadow-button-hover"
		>
			<CoverArt src={data.user!.avatarUrl} />
			<p class="text-center font-gothic text-xl tracking-wider text-light">Remixed Staff</p>
		</div>
	{:else}
		<div class="mx-auto max-w-80">
			<CoverArt
				src={data.user!.avatarUrl}
				class="relative top-0 text-text shadow-button transition-all hover:-top-1 hover:shadow-button-hover"
			/>
		</div>
	{/if}

	<h2 class="{styleH2} mt-12 mb-4 text-text">Projects</h2>
	{#if data.userProjects.length > 0}
		<div class="flex h-full flex-row flex-wrap justify-center gap-8">
			{#each data.userProjects as project}
				<CDProject {project} />
			{/each}
		</div>
	{:else}
		<p class="text-center font-gothic text-xl text-text">
			{data.user?.username} doesn't have any projects!
		</p>
	{/if}
</div>
