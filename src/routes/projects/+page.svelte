<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import CDProject from '$lib/CDProject.svelte';
	import CassetteProject from '$lib/CassetteProject.svelte';
	import { onMount } from 'svelte';
	import { styleButton, styleH1 } from '$lib/styles';
	import CoverArt from '$lib/CoverArt.svelte';

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
</script>

<img src="/dashboard/dots-tl.png" alt="dots" class="fixed top-0 left-0 w-2/3" />
<img src="/dashboard/dots-br.png" alt="dots" class="fixed right-0 bottom-0 w-3/5" />
<Sidebar />

<div class="relative z-2 flex h-screen w-screen items-center justify-center">
	<div class="grid grid-cols-3 gap-16">
		<a
			href="/projects/new"
			class="hover-effect flex w-70 flex-col items-center gap-8 rounded-3xl border-4 border-[#8B81FF] bg-text p-8"
		>
			<img src="/dashboard/plus_fill.png" alt="plus" class="m-4 w-16" />
			<h2 class="text-center font-jua text-4xl text-[#E2BEFF] text-shadow-lg/30">
				Create new project
			</h2>
		</a>
		{#each userProjects as proj}
			<a
				href="/projects/{proj.id}"
				class="hover-effect w-70 rounded-3xl border-4 border-[#8B81FF] bg-text p-4"
			>
				<CoverArt
					src={proj.coverArt}
					class="mb-4 h-30 w-full rounded-xl border-4 border-[#E2BEFF] object-cover"
				/>
				<div class="flex grow flex-col justify-end">
					<h2 class=" line-clamp-1 font-jua text-3xl text-[#E2BEFF] text-shadow-lg/30">
						{proj.title}
					</h2>
					<p class="line-clamp-3 font-jua text-[#E2BEFF]">{proj.description}</p>
				</div>
			</a>
		{/each}
	</div>
</div>
