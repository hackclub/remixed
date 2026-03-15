<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import AddressForm from '$lib/AddressForm.svelte';
	import Note from '$lib/Note.svelte';
	import { stylePopover, styleButton, styleH1, styleH2, styleInput } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />

<div class="{stylePopover} max-h-9/10" id="continue" popover>
	<h1 class="mb-8 text-center font-nikkyou text-3xl">Confirm</h1>
	<form action="?/placeOrder" method="POST">
		<AddressForm />
	</form>
</div>

<div class="h-screen pr-10 pl-40">
	<div class="flex h-full w-full flex-col justify-center">
		<h1 class="{styleH1} mb-4 text-text">PURCHASE</h1>
		<h2 class="{styleH2} mb-4 text-text">BALANCE: {data.balance}<Note /></h2>
		<div class="grid grid-cols-2 gap-2 bg-accent-purple shadow-button">
			<div class="{styleButton} m-12 bg-accent-red">
				<img src={data.item.imageUrl} alt="item" />
			</div>
			<div class="flex flex-col justify-between p-4">
				<div>
					<h2 class="{styleH2} mb-4 text-text">{data.item.name}</h2>
					<p class="text-center font-zcool text-text">{data.item.description}</p>
				</div>
				{#if data.item.cost <= data.balance}
					<button class="{styleButton} w-full bg-primary" popovertarget="continue"
						>Continue ({data.item.cost}<Note />)</button
					>
				{:else}
					<button class="{styleButton} w-full bg-accent-red"
						>Too Expensive! ({data.item.cost}<Note />)</button
					>
				{/if}
			</div>
		</div>
	</div>
</div>
