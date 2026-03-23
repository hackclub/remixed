<script lang="ts">
	import PageHeader from '$lib/PageHeader.svelte';
	import { styleInteractiveCard } from '$lib/styles';

	let { data } = $props();
</script>

<svelte:head>
	<title>Orders</title>
</svelte:head>

<PageHeader title="Orders" subtitle="Track the rewards you've already claimed." />

<div class="relative z-2 flex min-h-screen w-full flex-col items-center px-4 pt-52 pb-40 sm:px-8">
	{#if data.orders.length > 0}
		<div class="grid w-full max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
			{#each data.orders as orderInfo}
				<div class="{styleInteractiveCard} flex h-full items-center gap-4 p-4">
					<div
						class="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border-4 border-[#E2BEFF] bg-light p-3"
					>
						<img
							src={orderInfo.item.imageUrl}
							alt={orderInfo.item.name}
							class="max-h-full w-full object-contain"
						/>
					</div>
					<div class="flex min-w-0 grow flex-col justify-between">
						<div>
							<h2 class="text-3xl text-[#E2BEFF] text-shadow-flat">{orderInfo.item.name}</h2>
							<p
								class="{orderInfo.order.status == 'PENDING'
									? 'bg-accent-red'
									: 'bg-primary'} mt-3 w-max rounded-xl border-4 border-[#8B81FF] px-3 py-1 text-center font-jua text-sm text-text"
							>
								{orderInfo.order.status}
							</p>
						</div>
						<p class="mt-4 text-sm text-light/70">
							Order ID: #{orderInfo.order.id}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div
			class="w-full max-w-3xl rounded-[2rem] border-4 border-[#8B81FF] bg-text px-8 py-10 text-center font-jua text-2xl text-light shadow-xl/30"
		>
			You haven't ordered anything!
		</div>
	{/if}
</div>
