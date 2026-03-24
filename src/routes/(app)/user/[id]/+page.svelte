<script lang="ts">
	import CDProject from '$lib/CDProject.svelte';
	import CoverArt from '$lib/CoverArt.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { styleButton, styleCard, styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();

	function copyReferral() {
		navigator.clipboard.writeText(`https://remixed.hackclub.com/?ref=${data.user.id}`);
	}
</script>

<svelte:head>
	<title>{data.user.username} - Remixed</title>
</svelte:head>

<div class="p-10 pb-40">
	{#if data.currentUser?.id == data.user.id}
		<button class="{styleButton} mx-auto mb-4 block" onclick={copyReferral}
			>Copy Referral Link</button
		>
	{/if}
	<h1 class="{styleH1} mb-4 text-text">{data.user!.username}</h1>

	<div class="{styleCard} relative top-0 mx-auto max-w-80 p-4">
		<CoverArt src={data.user!.avatarUrl} class="rounded-2xl" />
		{#if data.user!.roles.includes('STAFF')}
			<p class="text-center font-gothic text-xl tracking-wider text-light">Remixed Staff</p>
		{/if}
	</div>

	<h2 class="{styleH2} mt-12 mb-4 text-text">Projects</h2>
	{#if data.userProjects.length > 0}
		<div class="flex h-full flex-row flex-wrap justify-center gap-8">
			{#each data.userProjects as proj}
				<ProjectCard {proj} />
			{/each}
		</div>
	{:else}
		<p class="text-center font-gothic text-xl text-text">
			{data.user?.username} doesn't have any projects!
		</p>
	{/if}
</div>
