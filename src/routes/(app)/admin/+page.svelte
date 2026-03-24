<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="p-10 pb-40 font-jua text-text">
	<div class="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each data.stats as stat}
			<div class="rounded-xl border-4 border-[#8B81FF] bg-bg px-6 py-5">
				<p class="text-lg text-text/70">{stat.label}</p>
				<p class="mt-2 text-4xl">{stat.value}</p>
				{#if stat.detail}
					<p class="mt-2 text-lg text-text/70">{stat.detail}</p>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
		{#each data.adminLinks as link}
			<a
				href={link.href}
				class="hover-effect-shadow flex min-h-44 flex-col gap-4 rounded-xl border-4 border-[#8B81FF] bg-text px-8 py-6 text-light text-shadow-flat"
			>
				<h3 class="text-3xl">{link.title}</h3>
				<p class="text-lg text-light/80 text-shadow-none">{link.description}</p>
			</a>
		{/each}
	</div>
</div>
