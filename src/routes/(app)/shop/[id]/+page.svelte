<script lang="ts">
	import type { PageProps } from './$types';
	import Note from '$lib/Note.svelte';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();

	function canAfford() {
		return data.item.cost <= (data.balance ?? 0);
	}

	const hasAddress = Boolean(data.address?.addressLine1);

	let visible = $state(false);
	onMount(() => requestAnimationFrame(() => (visible = true)));

	function goBack() {
		history.back();
	}
</script>

<svelte:head>
	<title>{data.item.name} - Shop - Remixed</title>
</svelte:head>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-40 bg-[#0d1a2d]/80 backdrop-blur-sm transition-opacity duration-300"
	style="opacity: {visible ? 1 : 0}"
	onclick={goBack}
	role="presentation"
></div>

<!-- Modal scroll container -->
<div
	class="fixed inset-0 z-50 overflow-y-auto project-scroll"
	onclick={(e) => { if (e.target === e.currentTarget) goBack(); }}
>
	<div class="flex min-h-full items-center justify-center px-4 py-12">
		<!-- Modal panel -->
		<div
			class="w-full max-w-4xl transition-all duration-300"
			style="opacity: {visible ? 1 : 0}; transform: translateY({visible ? '0' : '2rem'})"
		>
			<div class="flex flex-col gap-4 font-jua">

				<!-- Header banner -->
				<div class="relative overflow-hidden rounded-[2rem] border-4 border-[#8B81FF] bg-text px-8 py-7 shadow-2xl/30 sm:px-14 sm:py-9">
					<div
						class="pointer-events-none absolute inset-0 opacity-[0.04]"
						style="background-image: repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px);"
					></div>
					<div class="relative flex items-center gap-6">
						<div class="hidden flex-col gap-1.5 sm:flex" aria-hidden="true">
							<div class="h-3 w-3 rounded-full bg-secondary shadow-sm"></div>
							<div class="h-3 w-3 rounded-full bg-accent-purple shadow-sm"></div>
							<div class="h-3 w-3 rounded-full bg-primary shadow-sm"></div>
							<div class="h-3 w-3 rounded-full bg-accent-red shadow-sm"></div>
						</div>
						<div class="flex-1">
							<h1 class="font-daydream text-2xl text-[#E2BEFF] text-shadow-flat sm:text-4xl">
								Purchase
							</h1>
							<p class="mt-1 text-sm text-[#E2BEFF]/60 sm:text-base">
								woop woop! get your sweet loot!
							</p>
						</div>
						<button
							type="button"
							onclick={goBack}
							class="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#E2BEFF]/20 text-2xl text-[#E2BEFF]/60 transition-colors hover:border-[#E2BEFF]/50 hover:text-[#E2BEFF]"
							aria-label="Close"
						>×</button>
					</div>
				</div>

				<!-- Content -->
				<div class="rounded-[1.5rem] border-4 border-[#8B81FF] bg-text shadow-2xl/30">
					<div class="grid gap-0 lg:grid-cols-[minmax(0,18rem)_1fr]">

						<!-- Image panel -->
						<div class="flex items-center justify-center rounded-t-[1.25rem] bg-[#0d1a2d] p-8 lg:rounded-l-[1.25rem] lg:rounded-tr-none">
							<div class="relative w-full">
								<img
									src={data.item.imageUrl}
									alt={data.item.name}
									class="h-full w-full object-contain"
								/>
								<div class="absolute bottom-0 left-0 flex gap-1" aria-hidden="true">
									<div class="h-2 w-2 rounded-full bg-secondary/60"></div>
									<div class="h-2 w-2 rounded-full bg-accent-purple/60"></div>
									<div class="h-2 w-2 rounded-full bg-primary/60"></div>
								</div>
							</div>
						</div>

						<!-- Info + confirm panel -->
						<div class="flex flex-col gap-6 px-6 py-7 sm:px-8">

							<!-- Item info -->
							<div>
								<div class="mb-4 flex flex-wrap gap-2">
									<div class="flex items-center gap-1.5 rounded-xl border-4 border-[#8B81FF] bg-[#0d1a2d] px-4 py-2 text-lg text-[#E2BEFF]">
										<svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" class="shrink-0 opacity-70">
											<rect x="1" y="4" width="18" height="13" rx="3" stroke="#E2BEFF" stroke-width="2"/>
											<path d="M1 8h18" stroke="#E2BEFF" stroke-width="2"/>
											<circle cx="14.5" cy="13" r="1.5" fill="#E2BEFF"/>
										</svg>
										Balance: {data.balance ?? 0}<span style="filter: invert(1)"><Note /></span>
									</div>
									<div
										class="flex items-center rounded-xl px-4 py-2 text-lg
											{canAfford()
												? 'border-4 border-primary bg-primary text-text'
												: 'ring-4 ring-accent-red/60 bg-accent-red/10 text-accent-red'}"
									>
										Cost: {data.item.cost}{#if canAfford()}<Note />{:else}<span style="filter: invert(1)"><Note /></span>{/if}
									</div>
								</div>

								<h2 class="text-3xl text-[#E2BEFF] text-shadow-flat">{data.item.name}</h2>
								<p class="mt-3 text-base text-[#E2BEFF]/60 leading-snug">{data.item.description}</p>
							</div>

							<!-- Divider -->
							<div class="h-px w-full bg-[#8B81FF]/30"></div>

							{#if !canAfford()}
								<!-- Can't afford -->
								<div class="flex flex-col items-center gap-3 py-6 text-center">
									<div class="flex gap-1.5" aria-hidden="true">
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/60"></div>
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/40"></div>
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/20"></div>
									</div>
									<p class="text-xl text-accent-red">Not enough notes to purchase this item.</p>
									<p class="text-sm text-[#E2BEFF]/40">
										You need {data.item.cost - (data.balance ?? 0)} more<span style="filter: invert(1) sepia(1) saturate(3) hue-rotate(300deg)"><Note /></span> to unlock this reward.
									</p>
									<button
										type="button"
										onclick={goBack}
										class="hover-effect-shadow mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border-4 border-[#8B81FF] bg-text px-8 py-2 text-lg text-[#E2BEFF]"
									>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
											<circle cx="10" cy="10" r="9" fill="#E2BEFF"/>
											<text x="10" y="10" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="11" fill="#1B2A42">B</text>
										</svg>
										Go Back
									</button>
								</div>
							{:else if !hasAddress}
								<!-- No address on file -->
								<div class="flex flex-col items-center gap-3 py-6 text-center">
									<div class="flex gap-1.5" aria-hidden="true">
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/60"></div>
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/40"></div>
										<div class="h-2.5 w-2.5 rounded-full bg-accent-red/20"></div>
									</div>
									<p class="text-xl text-accent-red">No shipping address on file.</p>
									<p class="text-sm text-[#E2BEFF]/40">
										Make sure your Hack Club account has a primary address set.
									</p>
									<button
										type="button"
										onclick={goBack}
										class="hover-effect-shadow mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border-4 border-[#8B81FF] bg-text px-8 py-2 text-lg text-[#E2BEFF]"
									>
										<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
											<circle cx="10" cy="10" r="9" fill="#E2BEFF"/>
											<text x="10" y="10" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="11" fill="#1B2A42">B</text>
										</svg>
										Go Back
									</button>
								</div>
							{:else}
								<!-- Shipping address confirmation + place order -->
								<div>
									<div class="mb-4 w-full text-center gap-3">
										<span class="text-xl text-[#E2BEFF]">This item will ship to this address.</span>
									</div>

									<div class="rounded-xl border-2 border-[#8B81FF]/40 bg-[#0d1a2d] px-5 py-4 text-[#E2BEFF]/70 leading-relaxed">
										{#if data.address?.fullName}
											<p class="text-[#E2BEFF]">{data.address.fullName}</p>
										{/if}
										{#if data.address?.email}
											<p class="text-sm text-[#E2BEFF]/50">{data.address.email}</p>
										{/if}
										<p class="mt-2">{data.address?.addressLine1}</p>
										{#if data.address?.addressLine2}
											<p>{data.address.addressLine2}</p>
										{/if}
										<p>{data.address?.city}, {data.address?.state} {data.address?.zipCode}</p>
										<p>{data.address?.country}</p>
									</div>
								</div>

								<form action="?/placeOrder" method="POST" class="mt-auto">
									<button
										type="submit"
										class="hover-effect-shadow inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-4 border-[#8B81FF] bg-text px-8 py-3 text-xl text-[#E2BEFF]"
									>
										<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
											<circle cx="12" cy="12" r="11" fill="#E2BEFF"/>
											<text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-family="Jua" font-size="13" fill="#1B2A42">A</text>
										</svg>
										Confirm Order
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>

			</div>
		</div>
	</div>
</div>
