<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import Note from '$lib/Note.svelte';
	import { styleButton, styleH1, styleH2 } from '$lib/styles';
	import { onMount } from 'svelte';

	let shopItems: any[] = $state([]);

	let { data } = $props();

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

<div class="p-10">
	<h1 class="{styleH1} mb-4 text-text">SHOP</h1>
	<h2 class="{styleH2} mb-4 text-text">BALANCE: {data.user?.notesBalance}<Note /></h2>
	<a href="/shop/orders" class="{styleButton} mx-auto mb-8 block w-max bg-primary">Your Orders</a>
	{#if shopItems.length > 0}
		<div class="mb-8 flex flex-wrap justify-center gap-8">
			{#each shopItems as item}
				<div class="relative top-0 h-min w-60 bg-accent-purple p-4 shadow-button">
					<h2 class="{styleH2} mb-4 text-text">{item.name}</h2>
					<img src={item.imageUrl} alt="item" />
					<p class="my-4 text-center font-zcool text-sm text-text">{item.description}</p>
					<a
						href="/shop/{item.id}"
						class="{styleButton} {data.user && data.user.notesBalance >= item.cost
							? 'bg-primary'
							: 'bg-accent-red'} block w-full">{item.cost}<Note /></a
					>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-center font-gothic text-xl text-text">No items in store!</p>
	{/if}
</div>
