<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Admin Overview</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-bold">Overview</h1>
		<p class="text-base-content/50 text-sm mt-0.5">Platform statistics and administration</p>
	</div>

	<div class="stats stats-vertical sm:stats-horizontal shadow border border-base-300 w-full bg-base-100">
		{#each data.stats as stat}
			<div class="stat">
				<div class="stat-title">{stat.label}</div>
				<div class="stat-value text-2xl">{stat.value}</div>
				{#if stat.detail}
					<div class="stat-desc">{stat.detail}</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.adminLinks as link}
			<a
				href={link.href}
				class="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition-all duration-150"
			>
				<div class="card-body p-5">
					<h2 class="card-title text-sm font-semibold">{link.title}</h2>
					<p class="text-sm text-base-content/60">{link.description}</p>
				</div>
			</a>
		{/each}
	</div>
</div>
