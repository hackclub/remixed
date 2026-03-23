<script lang="ts">
	import type { PageProps } from './$types';
	import AddressForm from '$lib/AddressForm.svelte';
	import Note from '$lib/Note.svelte';
	import PageHeader from '$lib/PageHeader.svelte';
	import { styleAdminPopover, styleButton, styleCard } from '$lib/styles';

	let { data }: PageProps = $props();

	function canAfford() {
		return data.item.cost <= (data.balance ?? 0);
	}
</script>

<svelte:head>
	<title>Purchase</title>
</svelte:head>

<div
	class="{styleAdminPopover} max-h-[90vh] w-[min(92vw,40rem)] overflow-y-auto rounded-[2rem] border-4 border-[#8B81FF] shadow-2xl/30"
	id="continue"
	popover
>
	<h1 class="mb-8 text-center font-jua text-4xl text-shadow-flat">Confirm</h1>
	<form action="?/placeOrder" method="POST">
		<AddressForm />
	</form>
</div>

<PageHeader
	title="Purchase"
	subtitle="Review the reward details, then confirm your shipping info."
/>

<div class="relative z-2 flex min-h-screen w-full items-start justify-center px-4 pt-52 pb-40 sm:px-8">
	<div class="{styleCard} grid w-full max-w-5xl gap-6 p-6 lg:grid-cols-[minmax(0,20.125rem)_1fr]">
		<div
			class="mx-auto flex aspect-square w-full max-w-[20.125rem] items-center justify-center rounded-2xl border-4 border-[#E2BEFF] bg-light p-6"
		>
			<img src={data.item.imageUrl} alt={data.item.name} class="h-full w-full object-contain" />
		</div>
		<div class="flex flex-col justify-between font-jua">
			<div>
				<div class="mb-6 flex flex-wrap gap-3">
					<div
						class="rounded-2xl border-4 border-[#8B81FF] bg-light px-4 py-2 font-jua text-xl text-text"
					>
						Balance: {data.balance ?? 0}<Note />
					</div>
					<div
						class="rounded-2xl border-4 border-[#8B81FF] bg-light px-4 py-2 font-jua text-xl text-text"
					>
						Cost: {data.item.cost}<Note />
					</div>
				</div>
				<h2 class="text-4xl text-[#E2BEFF] text-shadow-flat">{data.item.name}</h2>
				<p class="mt-4 text-xl text-light/80">{data.item.description}</p>
			</div>

			{#if canAfford()}
				<button class="{styleButton} mt-8 w-full bg-primary text-text" popovertarget="continue"
					>Continue ({data.item.cost}<Note />)</button
				>
			{:else}
				<button class="{styleButton} mt-8 w-full bg-accent-red" disabled
					>Too Expensive! ({data.item.cost}<Note />)</button
				>
			{/if}
		</div>
	</div>
</div>
