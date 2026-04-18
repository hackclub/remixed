<script lang="ts">
	import BoldText from '$lib/BoldText.svelte';
	import Note from '$lib/Note.svelte';
	import PageHeader from '$lib/PageHeader.svelte';
	import { onMount } from 'svelte';

	let shopItems: any[] = $state([]);
	let mounted = $state(false);
	let activeCategory = $state<string | null>(null);

	type ShopProps = {
		data: {
			user?: App.Locals['user'];
		};
	};

	let { data }: ShopProps = $props();

	function canAfford(cost: number) {
		return (data.user?.notesBalance ?? 0) >= cost;
	}

	function sortShopItems(items: any[]) {
		return [...items].sort((a, b) => a.cost - b.cost || a.id - b.id);
	}

	function groupByCategory(items: any[]) {
		const groups: Record<string, any[]> = {};
		for (const item of items) {
			let categories = (item.categories ?? []).filter((c: string) => c);
			categories = categories.length > 0 ? categories : ['Uncategorized'];
			for (const cat of categories) {
				if (!groups[cat]) groups[cat] = [];
				groups[cat].push(item);
			}
		}
		for (const cat of Object.keys(groups)) {
			groups[cat] = sortShopItems(groups[cat]);
		}
		return groups;
	}

	onMount(() => {
		requestAnimationFrame(() => (mounted = true));

		try {
			const cached = localStorage.getItem('shopItems');
			if (cached) shopItems = sortShopItems(JSON.parse(cached));
		} catch {
			localStorage.removeItem('shopItems');
		}

		fetch('/api/shop')
			.then((r) => r.json())
			.then((fetchedData) => {
				const sortedItems = sortShopItems(fetchedData);
				shopItems = sortedItems;
				localStorage.setItem('shopItems', JSON.stringify(sortedItems));
			});
	});

	let groupedItems = $derived(groupByCategory(shopItems));
	let categories = $derived(Object.keys(groupedItems).sort());

	let visibleGroups = $derived(activeCategory ? { [activeCategory]: groupedItems[activeCategory] ?? [] } : groupedItems);
	let visibleCategories = $derived(activeCategory ? [activeCategory] : categories);
</script>

<svelte:head>
	<title>Shop - Remixed</title>
</svelte:head>

<PageHeader title="Shop" subtitle="Spend your notes on rewards for the projects you ship.">
	{#snippet description()}
		<div class="flex items-center rounded-2xl border-4 border-[#8B81FF] bg-[#1B2A42] px-4 py-2 text-lg text-[#E2BEFF]">
			{data.user?.notesBalance ?? 0}<span style="filter: brightness(0) saturate(100%) invert(80%) sepia(37%) saturate(392%) hue-rotate(215deg) brightness(105%)"><Note /></span>
		</div>
		<a
			href="/shop/orders"
			class="hover-effect-shadow inline-flex cursor-pointer items-center gap-2 rounded-xl border-4 border-[#8B81FF] bg-text px-5 py-2 text-lg text-[#E2BEFF]"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<circle cx="10" cy="10" r="9" fill="#E2BEFF"/>
				<text x="10" y="10" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="11" fill="#1B2A42">B</text>
			</svg>
			Orders
		</a>
	{/snippet}
</PageHeader>

<div class="relative z-2 flex min-h-screen w-full flex-col items-center px-4 pt-56 pb-40 sm:px-8">

	<!-- Category tab navigation -->
	{#if categories.length > 1}
		<div
			class="no-scrollbar mb-8 flex w-full max-w-[90rem] gap-2 overflow-x-auto pt-2 pb-2 block-reveal"
			class:revealed={mounted}
			style="--block-i:0; --block-stagger:100ms"
		>
			<button
				onclick={() => (activeCategory = null)}
				class="hover-effect-shadow shrink-0 cursor-pointer rounded-xl border-4 px-5 py-2 font-jua text-lg transition-colors
					{activeCategory === null
						? 'border-primary bg-primary text-text'
						: 'border-[#8B81FF] bg-text text-[#E2BEFF]'}"
			>
				All
			</button>
			{#each categories as cat}
				<button
					onclick={() => (activeCategory = activeCategory === cat ? null : cat)}
					class="hover-effect-shadow shrink-0 cursor-pointer rounded-xl border-4 px-5 py-2 font-jua text-lg transition-colors
						{activeCategory === cat
							? 'border-secondary bg-secondary text-text'
							: 'border-[#8B81FF] bg-text text-[#E2BEFF]'}"
				>
					{cat}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Item grid -->
	{#if shopItems.length > 0}
		<div class="flex w-full max-w-[90rem] flex-col gap-14">
			{#each visibleCategories as category, catIdx}
				<section
					class="block-reveal"
					class:revealed={mounted}
					style="--block-i:{catIdx + 1}; --block-stagger:100ms"
				>
					<!-- Section header -->
					<div class="mb-5 flex items-center gap-3">
						<div
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-4 border-[#8B81FF] bg-text font-jua text-base font-bold text-[#E2BEFF]"
						>
							{String(catIdx + 1).padStart(2, '0')}
						</div>
						<BoldText class="font-jua text-3xl sm:text-4xl" stroke="2">
							{category}
						</BoldText>
					</div>

					<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
						{#each visibleGroups[category] as item, itemIdx}
							{@const affordable = canAfford(item.cost)}
							<a
								href="/shop/{item.id}"
								class="hover-effect-shadow group relative flex flex-col overflow-hidden rounded-[1.5rem] border-4 border-[#8B81FF] bg-text transition-all hover:border-secondary"
								style="animation-delay: {itemIdx * 60}ms"
							>
								<!-- Game cover image area -->
								<div class="relative aspect-square w-full overflow-hidden bg-[#0d1a2d]">
									<img
										src={item.imageUrl}
										alt={item.name}
										class="h-full w-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
									/>

									<!-- Can't-afford lock badge -->
									{#if !affordable}
										<div class="absolute top-3 right-3 flex items-center gap-1.5 rounded-xl border-2 border-accent-red/60 bg-text/90 px-3 py-1.5 font-jua text-sm text-accent-red">
											<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
												<rect x="2" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
												<path d="M4.5 5.5V4a2 2 0 1 1 4 0v1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
											</svg>
											Need more notes
										</div>
									{/if}

									<!-- Decorative corner dots (Joy-Con style) -->
									<div class="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
										<div class="h-2 w-2 rounded-full bg-secondary/60"></div>
										<div class="h-2 w-2 rounded-full bg-accent-purple/60"></div>
										<div class="h-2 w-2 rounded-full bg-primary/60"></div>
									</div>
								</div>

								<!-- Info panel -->
								<div class="flex grow flex-col gap-3 px-5 py-4 font-jua">
									<div class="flex items-start justify-between gap-3">
										<h3 class="text-2xl leading-tight text-[#E2BEFF] text-shadow-flat">
											{item.name}
										</h3>

										<!-- Price tag -->
										<div
											class="shrink-0 rounded-xl px-3 py-1 text-lg leading-none
												{affordable
													? 'border-4 border-primary bg-primary text-text'
													: 'ring-4 ring-accent-red/60 bg-accent-red/10 text-accent-red'}"
										>
											{item.cost}{#if affordable}<Note />{:else}<span style="filter: invert(1)"><Note /></span>{/if}
										</div>
									</div>

									<p class="grow text-base text-[#E2BEFF]/60 leading-snug">{item.description}</p>

									<!-- "A" button CTA -->
									<div
										class="mt-1 flex items-center gap-2 self-end rounded-xl border-2 border-[#8B81FF]/50 bg-[#0d1a2d] px-4 py-2 text-base text-[#E2BEFF]/70 transition-colors group-hover:border-secondary group-hover:text-secondary"
									>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
											<circle cx="10" cy="10" r="9" fill="#E2BEFF" class="transition-all group-hover:fill-secondary"/>
											<text x="10" y="10" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="11" fill="#1B2A42">A</text>
										</svg>
										View
									</div>
								</div>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{:else}
		<!-- Empty state -->
		<div
			class="w-full max-w-3xl rounded-[2rem] border-4 border-[#8B81FF] bg-text px-8 py-14 text-center font-jua shadow-xl/30 block-reveal"
			class:revealed={mounted}
			style="--block-i:0; --block-stagger:100ms"
		>
			<div class="mb-4 flex justify-center gap-2" aria-hidden="true">
				<div class="h-3 w-3 rounded-full bg-secondary"></div>
				<div class="h-3 w-3 rounded-full bg-accent-purple"></div>
				<div class="h-3 w-3 rounded-full bg-primary"></div>
				<div class="h-3 w-3 rounded-full bg-accent-red"></div>
			</div>
			<p class="text-2xl text-[#E2BEFF]">No items in store!</p>
			<p class="mt-2 text-base text-[#E2BEFF]/50">Check back later for new rewards.</p>
		</div>
	{/if}
</div>
