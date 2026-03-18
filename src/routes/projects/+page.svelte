<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CDProject from '$lib/CDProject.svelte';
	import CassetteProject from '$lib/CassetteProject.svelte';
	import ProfileCard from '$lib/ProfileCard.svelte';
	import { onMount } from 'svelte';
	import { styleButton, styleH1 } from '$lib/styles';
	import CoverArt from '$lib/CoverArt.svelte';

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

		fetch('/api/projects')
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

<img src="/dashboard/dots-tl.png" alt="dots" class="fixed top-0 left-0 w-2/3" />
<img src="/dashboard/dots-br.png" alt="dots" class="fixed right-0 bottom-0 w-3/5" />
<Sidebar />
<ProfileCard user={data.user} />

<div class="relative z-2 flex h-screen w-screen items-center justify-center">
	<button class="hover-effect mr-8 cursor-pointer" onclick={() => scroll(false)}>
		<img src="/dashboard/arrow-left.png" alt="arrow" class="w-16" />
	</button>
	<div
		bind:this={projectView}
		class="no-scrollbar grid max-w-[calc(18rem*3+4rem*2)] snap-x snap-mandatory auto-cols-max grid-flow-col gap-16 overflow-x-auto py-4"
	>
		<a
			href="/projects/new"
			class="hover-effect-shadow flex w-72 snap-start flex-col items-center gap-8 rounded-3xl border-4 border-[#8B81FF] bg-text p-8"
		>
			<img src="/dashboard/plus_fill.png" alt="plus" class="m-4 w-16" />
			<h2 class="text-center font-jua text-4xl text-[#E2BEFF] text-shadow-flat">
				Create new project
			</h2>
		</a>
		{#each userProjects as proj}
			<a
				href="/projects/{proj.id}"
				class="hover-effect-shadow w-72 snap-start rounded-3xl border-4 border-[#8B81FF] bg-text p-4"
			>
				<CoverArt
					src={proj.coverArt}
					class="mb-4 h-30 w-full rounded-xl border-4 border-[#E2BEFF] object-cover"
				/>
				<div class="flex grow flex-col justify-end">
					<h2 class=" line-clamp-1 font-jua text-3xl text-[#E2BEFF] text-shadow-flat">
						{proj.title}
					</h2>
					<p class="line-clamp-3 font-jua text-[#E2BEFF]">{proj.description}</p>
				</div>
			</a>
		{/each}
	</div>
	<button class="hover-effect ml-8 cursor-pointer" onclick={() => scroll(true)}>
		<img src="/dashboard/arrow-left.png" alt="arrow" class="w-16 rotate-180" />
	</button>
</div>
