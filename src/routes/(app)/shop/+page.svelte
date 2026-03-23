<script lang="ts">
	import Note from '$lib/Note.svelte';
	import PageHeader from '$lib/PageHeader.svelte';
	import { styleButton, styleInteractiveCard } from '$lib/styles';
	import { onMount } from 'svelte';

	let shopItems: any[] = $state([]);

	let { data } = $props();

	function canAfford(cost: number) {
		return (data.user?.notesBalance ?? 0) >= cost;
	}

	onMount(() => {
		try {
			const cached = localStorage.getItem('shopItems');
			if (cached) shopItems = JSON.parse(cached);
		} catch {
			localStorage.removeItem('shopItems');
		}

		fetch('/api/shop')
			.then((r) => r.json())
			.then((data) => {
				shopItems = data;
				localStorage.setItem('shopItems', JSON.stringify(data));
			});
	});
</script>

<svelte:head>
	<title>Shop</title>
</svelte:head>

<PageHeader
	title="Shop"
	subtitle="Spend your notes on rewards for the projects you ship."
/>

<div class="relative z-2 flex min-h-screen w-full flex-col items-center px-4 pt-52 pb-40 sm:px-8">
	<div class="mb-8 flex w-full max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
		<div
			class="rounded-2xl border-4 border-[#8B81FF] bg-text px-6 py-4 font-jua text-2xl text-light text-shadow-flat"
		>
			Balance: {data.user?.notesBalance ?? 0}<Note />
		</div>
		<a href="/shop/orders" class="{styleButton} block w-full bg-primary px-8 text-xl text-text sm:w-auto"
			>Your Orders</a
		>
	</div>

	{#if shopItems.length > 0}
		<div class="grid w-full max-w-6xl gap-8 sm:grid-cols-2 xl:grid-cols-3">
			{#each shopItems as item}
				<a href="/shop/{item.id}" class="{styleInteractiveCard} flex h-full flex-col p-4">
					<div
						class="flex aspect-square items-center justify-center rounded-2xl border-4 border-[#E2BEFF] bg-light p-4"
					>
						<img src={item.imageUrl} alt={item.name} class="max-h-full w-full object-contain" />
					</div>
					<div class="mt-4 flex grow flex-col">
						<h2 class="text-3xl text-[#E2BEFF] text-shadow-flat">{item.name}</h2>
						<p class="mt-3 grow text-lg text-light/80">{item.description}</p>
						<div
							class="{styleButton} mt-6 block w-full px-4 py-2 text-xl {canAfford(item.cost)
								? 'bg-primary text-text'
								: 'bg-accent-red'}"
						>
							{item.cost}<Note />
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div
			class="w-full max-w-3xl rounded-[2rem] border-4 border-[#8B81FF] bg-text px-8 py-10 text-center font-jua text-2xl text-light shadow-xl/30"
		>
			No items in store!
		</div>
	{/if}
</div>
