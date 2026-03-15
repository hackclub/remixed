<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import Note from '$lib/Note.svelte';
	import { styleButton, styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />
<div class="p-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">SHOP</h1>
	<h2 class="{styleH2} mb-4 text-text">BALANCE: {data.balance}<Note /></h2>
	<a href="/shop/orders" class="{styleButton} mx-auto mb-8 block w-max bg-primary">Your Orders</a>
	<div class="mb-8 flex flex-wrap justify-center gap-8">
		{#each data.items as item}
			<div class="relative top-0 h-min w-60 bg-accent-purple p-4 shadow-button">
				<h2 class="{styleH2} mb-4 text-text">{item.name}</h2>
				<img src={item.imageUrl} alt="item" />
				<p class="my-4 text-center font-zcool text-sm text-text">{item.description}</p>
				<a
					href="/shop/{item.id}"
					class="{styleButton} {data.balance >= item.cost
						? 'bg-primary'
						: 'bg-accent-red'} block w-full">{item.cost}<Note /></a
				>
			</div>
		{/each}
	</div>
</div>
