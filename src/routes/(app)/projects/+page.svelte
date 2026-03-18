<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import PageHeader from '$lib/PageHeader.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import { onMount } from 'svelte';
	import { styleButton, styleH1 } from '$lib/styles';

	let { data } = $props();
	let projectView: HTMLElement | null = $state(null);
	let userProjects: any[] = $state([]);

	onMount(() => {
		try {
			const cached = localStorage.getItem('userProjects');
			if (cached) userProjects = JSON.parse(cached);
		} catch {
			localStorage.removeItem('userProjects');
		}

		fetch('/api/user_projects')
			.then((r) => r.json())
			.then((data) => {
				userProjects = data;
				localStorage.setItem('userProjects', JSON.stringify(data));
			});
	});

	function scroll(right: boolean) {
		if (!projectView) return;

		if (right) {
			projectView.scrollBy({ left: 300, behavior: 'smooth' });
		} else {
			projectView.scrollBy({ left: -300, behavior: 'smooth' });
		}
	}
</script>

<PageHeader
	title="Projects"
	desc="Describe your idea for a project, build it, then ship and get prizes!"
/>

<div class="relative z-2 flex h-screen w-screen flex-col items-center justify-center pt-16">
	<div class="flex items-center">
		<button class="hover-effect mr-8 h-min cursor-pointer" onclick={() => scroll(false)}>
			<img src="/dashboard/arrow-left.png" alt="arrow" class="w-16" />
		</button>
		<div
			bind:this={projectView}
			class="no-scrollbar grid max-w-[calc(18rem*3+4rem*2)] snap-x snap-mandatory auto-cols-max grid-flow-col gap-16 overflow-x-auto py-4"
		>
			<a
				href="/projects/new"
				class="hover-effect-shadow flex w-72 snap-center flex-col items-center gap-8 rounded-3xl border-4 border-[#8B81FF] bg-text p-8"
			>
				<img src="/dashboard/plus_fill.png" alt="plus" class="m-4 w-16" />
				<h2 class="text-center font-jua text-4xl text-[#E2BEFF] text-shadow-flat">
					Create new project
				</h2>
			</a>
			{#each userProjects as proj}
				<ProjectCard {proj} />
			{/each}
		</div>
		<button class="hover-effect ml-8 h-min cursor-pointer" onclick={() => scroll(true)}>
			<img src="/dashboard/arrow-left.png" alt="arrow" class="w-16 rotate-180" />
		</button>
	</div>
	<p class="mt-8 text-center font-jua text-2xl text-light text-shadow-flat">
		Click on a project to ship or edit it.<br />
		Use the arrows to navigate.
	</p>
</div>
