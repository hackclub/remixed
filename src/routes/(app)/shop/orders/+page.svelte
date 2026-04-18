<script lang="ts">
	import type { PageProps } from './$types';
	import PageHeader from '$lib/PageHeader.svelte';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();

	let mounted = $state(false);
	onMount(() => requestAnimationFrame(() => (mounted = true)));
</script>

<svelte:head>
	<title>Orders - Remixed</title>
</svelte:head>

<PageHeader title="Orders" subtitle="Track the rewards you've already claimed.">
	{#snippet description()}
		<a
			href="/shop"
			class="hover-effect-shadow inline-flex cursor-pointer items-center gap-2 rounded-xl border-4 border-[#8B81FF] bg-text px-5 py-2 font-jua text-lg text-[#E2BEFF]"
		>
			<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
				<circle cx="10" cy="10" r="9" fill="#E2BEFF"/>
				<text x="10" y="10" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="11" fill="#1B2A42">B</text>
			</svg>
			Back to Shop
		</a>
	{/snippet}
</PageHeader>

<div class="relative z-2 flex min-h-screen w-full flex-col items-center px-4 pt-56 pb-40 sm:px-8">

	{#if data.orders.length > 0}
		<div class="grid w-full max-w-[90rem] gap-5 md:grid-cols-2 xl:grid-cols-3">
			{#each data.orders as orderInfo, i}
				<div
					class="block-reveal"
					class:revealed={mounted}
					style="--block-i:{i}; --block-stagger:60ms"
				>
					<div class="hover-effect-shadow flex flex-col overflow-hidden rounded-[1.5rem] border-4 border-[#8B81FF] bg-text">
						<!-- Image area -->
						<div class="relative flex items-center justify-center bg-[#0d1a2d] px-8 py-6">
							<img
								src={orderInfo.item.imageUrl}
								alt={orderInfo.item.name}
								class="h-32 w-32 object-contain"
							/>
							<!-- Joy-Con dots -->
							<div class="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
								<div class="h-2 w-2 rounded-full bg-secondary/60"></div>
								<div class="h-2 w-2 rounded-full bg-accent-purple/60"></div>
								<div class="h-2 w-2 rounded-full bg-primary/60"></div>
							</div>
							<!-- Status badge -->
							<div
								class="absolute top-3 right-3 rounded-xl px-3 py-1.5 font-jua text-sm
									{orderInfo.order.status === 'FULFILLED'
										? 'border-4 border-primary bg-primary text-text'
										: 'ring-4 ring-accent-red/60 bg-accent-red/10 text-accent-red'}"
							>
								{orderInfo.order.status === 'FULFILLED' ? 'Fulfilled' : 'Pending'}
							</div>
						</div>

						<!-- Info panel -->
						<div class="flex grow flex-col gap-2 px-5 py-4 font-jua">
							<h2 class="text-2xl leading-tight text-[#E2BEFF] text-shadow-flat">
								{orderInfo.item.name}
							</h2>
							<p class="text-sm text-[#E2BEFF]/40">Order #{orderInfo.order.id}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
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
			<p class="text-2xl text-[#E2BEFF]">No orders yet!</p>
			<p class="mt-2 text-base text-[#E2BEFF]/50">Head to the shop and spend some notes.</p>
		</div>
	{/if}
</div>
