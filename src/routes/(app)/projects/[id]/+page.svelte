<script lang="ts">
	import BoldText from '$lib/BoldText.svelte';
	import CoverArt from '$lib/CoverArt.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { formatHours, formatProjectCategory, PROJECT_CATEGORY_OPTIONS, validUrl } from '$lib';
	import { styleButton, styleH3, styleInput, stylePopover } from '$lib/styles';

	let { data }: PageProps = $props();

	let hackatimeProjects: null | any[] = $state(null);
	let hoursText: string = $state('LOADING');
	let editing: boolean = $state(false);
	let canShip: boolean = $derived(
		data.shipsAllowed &&
			data.pendingShips.length == 0 &&
			data.shippableSeconds >= 3600 &&
			validUrl(data.project?.demoUrl ?? null) &&
			validUrl(data.project?.githubUrl ?? null) &&
			data.project?.hackatimeProjects.length != 0 &&
			!editing,
	);
	let showShipButton: boolean = $derived(
		data.shipsAllowed && data.pendingShips.length == 0 && !editing,
	);

	let draft = $state({ ...data.project });

	const isOwner = data.currentUserId == data.project?.userId;

	function startEdit() {
		editing = true;
		if (hackatimeProjects == null) {
			fetch('/api/hackatime')
				.then((resp) => resp.json())
				.then((r) => (hackatimeProjects = r));
		}
	}

	function cancelEdit() {
		draft = { ...data.project };
		editing = false;
	}

	onMount(() => {
		if (isOwner) {
			fetch(`/api/project_time?id=${data.project!.id}`)
				.then((resp) => resp.text())
				.then((text) => (hoursText = formatHours(Number(text))));
		}
	});

	if (data.project!.hackatimeSeconds) {
		hoursText = formatHours(data.project!.hackatimeSeconds);
	} else {
		hoursText = '0h 0m';
	}
</script>

<svelte:head>
	<title>{data.project.title} - Remixed</title>
	<meta property="og:description" content={data.project.description} />
</svelte:head>

<!-- Popovers -->
<div class="{stylePopover} font-jua text-text" popover id="shipProject">
	<form method="POST" action="?/ship">
		<h2 class="text-center text-3xl">Are you sure you want to ship <b>{data.project.title}</b>?</h2>
		<i class="my-4 block text-center text-xl">{formatHours(data.shippableSeconds)}</i>
		<input type="submit" value="Ship" class="{styleButton} w-full" />
	</form>
</div>

<div class="{stylePopover} font-jua text-text" popover id="cancelShip">
	<form method="POST" action="?/cancelShip">
		<h2 class="text-center text-3xl">
			Are you sure you want to cancel <b>{data.project.title}</b>'s ship?
		</h2>
		{#if data.pendingShips.length > 0}
			<i class="my-4 block text-center text-xl">{formatHours(data.pendingShips[0].seconds)}</i>
			<input type="submit" value="Confirm" class="{styleButton} w-full" />
		{/if}
	</form>
</div>

<div
	class="fixed top-1/2 left-1/2 max-h-[90vh] w-full max-w-4xl -translate-1/2 overflow-y-auto rounded-[2rem] border-4 border-[#8B81FF] bg-text px-6 py-8 font-jua text-light shadow-2xl/30 sm:px-10 sm:py-10"
	popover
	id="editProject"
>
	<form method="POST" action="?/update" class="flex flex-col">
		<h1 class="text-left text-4xl text-[#E2BEFF] text-shadow-flat sm:text-5xl">
			Edit project
		</h1>
		<p class="mt-1 mb-8 text-left text-lg text-[#E2BEFF]">
			Update your project details below.
		</p>

		<div>
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="title">Title</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Give your project a cool name!</p>
			<input
				type="text"
				id="title"
				name="title"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
				bind:value={draft.title}
				required
			/>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="description">Description</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Describe what your project is in detail.</p>
			<textarea
				id="description"
				name="description"
				rows="6"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
				bind:value={draft.description}
			></textarea>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="hackatimeProjects">Hackatime Projects</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Use Ctrl+Click to select multiple!</p>
			<select
				multiple
				id="hackatimeProjects"
				name="hackatimeProjects"
				class="min-h-52 w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
			>
				{#if hackatimeProjects && hackatimeProjects.length > 0}
					{#each hackatimeProjects as proj}
						{#if proj.claimedBy == null || proj.claimedBy == data.project!.id}
							<option selected={proj.claimedBy == data.project!.id} value={proj.name}>
								{proj.name}
							</option>
						{:else}
							<option disabled value={proj.name}>{proj.name}</option>
						{/if}
					{/each}
				{:else}
					<option disabled value="none">No Projects Found</option>
				{/if}
			</select>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="category">Category</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">What kind of project are ya making?</p>
			<select
				name="category"
				id="category"
				bind:value={draft.category}
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
			>
				{#each PROJECT_CATEGORY_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="coverArt">Cover Art URL</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">A link to your project's cover image.</p>
			<input
				type="url"
				id="coverArt"
				name="coverArt"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 font-mono text-sm text-[#E2BEFF] outline-none"
				bind:value={draft.coverArt}
			/>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="githubUrl">Repository URL</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Link to your project's source code.</p>
			<input
				type="url"
				id="githubUrl"
				name="githubUrl"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 font-mono text-sm text-[#E2BEFF] outline-none"
				bind:value={draft.githubUrl}
			/>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="demoUrl">Demo URL</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Link to a live demo of your project.</p>
			<input
				type="url"
				id="demoUrl"
				name="demoUrl"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 font-mono text-sm text-[#E2BEFF] outline-none"
				bind:value={draft.demoUrl}
			/>
		</div>

		<button
			type="submit"
			class="relative top-0 mx-auto mt-8 w-max cursor-pointer rounded-2xl bg-linear-to-r from-secondary to-[#54C1D7] p-1 shadow-none transition-all hover:-top-1 hover:shadow-lg/30 active:top-1 active:shadow-none"
		>
			<div class="rounded-xl bg-text px-16 py-2">
				<div class="relative text-3xl">
					<span class="text-stroke text-stroke-1 bg-linear-to-r from-[#6EF5FB] to-[#938BEC] p-1">
						save changes
					</span>
					<span
						class="absolute top-0 left-0 bg-linear-to-b from-[#3E236D] to-[#42518E] bg-clip-text p-1 pt-0 text-transparent"
					>
						save changes
					</span>
				</div>
			</div>
		</button>
	</form>
</div>

<!-- Main Layout -->
<div class="relative flex min-h-screen w-full flex-col overflow-hidden pb-0 lg:flex-row lg:gap-4 lg:pb-32">
	<!-- Left Side -->
	<div class="flex w-full shrink-0 flex-col gap-6 px-6 pt-8 sm:px-10 lg:w-[55%] lg:gap-10 lg:pl-20 lg:pr-0 lg:pt-16">
		<!-- Screenshot area -->
		<div class="relative -rotate-3">
			<!-- Disc behind screenshot -->
			<img
				src="/project/disc.png"
				alt=""
				class="absolute -top-6 left-2 z-0 aspect-square w-52 -rotate-[173.97deg] object-cover sm:w-64 lg:-top-8 lg:left-4 lg:w-88"
			/>

			<!-- Screenshot Cover -->
			<div class="pointer-events-none relative z-10 mt-14 flex w-fit sm:mt-16 lg:mt-20">
				<!-- Category Sidebar -->
				<div
					class="flex h-[200px] w-10 shrink-0 items-center justify-center overflow-hidden bg-[#1d3047] sm:h-[250px] sm:w-11 lg:h-[310px] lg:w-12"
				>
					<p
						class="-rotate-90 whitespace-nowrap font-nikkyou text-[20px] tracking-tight text-[#8b81ff] text-shadow-flat sm:text-[24px] lg:text-[28px]"
					>
						{formatProjectCategory(data.project!.category).toUpperCase()}
					</p>
				</div>
				<!-- Screenshot Image -->
				<div class="h-[200px] w-[200px] shrink-0 overflow-hidden shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] sm:h-[250px] sm:w-[250px] lg:h-[310px] lg:w-[305px]">
					<CoverArt
						src={draft.coverArt}
						class="h-full w-full object-cover"
					/>
				</div>
			</div>

			<!-- Repo / Demo Buttons - tucked behind screenshot on desktop -->
			<div class="hidden lg:absolute lg:top-28 lg:left-[340px] lg:z-5 lg:flex lg:flex-col lg:gap-7">
				{#if validUrl(draft.githubUrl)}
					<a href={draft.githubUrl} target="_blank" rel="noopener noreferrer" class="skew-btn group relative block w-96">
						<img
							src="/project/skew-btn-bg.svg"
							alt=""
							class="pointer-events-none h-24 w-full -scale-y-100 skew-x-2"
						/>
						<div class="absolute inset-0 flex flex-col items-start justify-center pl-14 rotate-1">
							<p class="font-nikkyou text-[32px] tracking-tight text-[#e2beff] text-shadow-flat">
								REPO
							</p>
							<p class="font-nikkyou text-[16px] tracking-tight text-[#e2beff] text-shadow-flat opacity-80">
								View the source code!
							</p>
						</div>
					</a>
				{/if}
				{#if validUrl(draft.demoUrl)}
					<a href={draft.demoUrl} target="_blank" rel="noopener noreferrer" class="skew-btn group relative block w-96">
						<img
							src="/project/skew-btn-bg-alt.svg"
							alt=""
							class="pointer-events-none h-24 w-full skew-x-2 -scale-y-100"
						/>
						<div class="absolute inset-0 flex flex-col items-start justify-center pl-14 rotate-1">
							<p class="font-nikkyou text-[32px] tracking-tight text-[#e2beff] text-shadow-flat">
								DEMO
							</p>
							<p class="font-nikkyou text-[16px] tracking-tight text-[#e2beff] text-shadow-flat opacity-80">
								Use the project!
							</p>
						</div>
					</a>
				{/if}
			</div>
		</div>

		<!-- Primary Details -->
		<div class="my-4 flex flex-col gap-2 pl-2 lg:my-0 lg:pl-4">
			<BoldText class="font-jua text-3xl tracking-tight sm:text-4xl lg:text-5xl" stroke="2">
				{draft.title}
			</BoldText>
			<div class="flex items-end gap-2 sm:gap-3">
				<CoverArt
					src={data.user.avatarUrl ?? undefined}
					class="h-7 w-7 shrink-0 rounded-full shadow-lg sm:h-9 sm:w-9"
				/>
				<p class="font-jua text-[22px] leading-none tracking-tight text-white text-shadow-flat sm:text-[26px] lg:text-[32px]">
					by <a href="/user/{data.user.id}" class="hover:underline">@{data.user.username}</a>
					{#if data.project.hackatimeProjects.length > 0}
						<span class="whitespace-pre"> &bull;  {hoursText}</span>
					{/if}
				</p>
			</div>
		</div>

		<!-- Mobile Repo / Demo Buttons - full width, touching left edge -->
		<div class="-ml-9 flex flex-col gap-4 sm:-ml-14 lg:hidden">
			{#if validUrl(draft.githubUrl)}
				<a href={draft.githubUrl} target="_blank" rel="noopener noreferrer" class="skew-btn group relative block w-full">
					<img
						src="/project/skew-btn-bg.svg"
						alt=""
						class="pointer-events-none h-20 w-full -scale-y-100 sm:h-24"
					/>
					<div class="absolute inset-0 flex flex-col items-start justify-center pl-8 sm:pl-12">
						<p class="font-nikkyou text-[28px] tracking-tight text-[#e2beff] text-shadow-flat sm:text-[32px]">
							REPO
						</p>
						<p class="font-nikkyou text-[14px] tracking-tight text-[#e2beff] text-shadow-flat opacity-80 sm:text-[16px]">
							View the source code!
						</p>
					</div>
				</a>
			{/if}
			{#if validUrl(draft.demoUrl)}
				<a href={draft.demoUrl} target="_blank" rel="noopener noreferrer" class="skew-btn group relative block w-full">
					<img
						src="/project/skew-btn-bg-alt.svg"
						alt=""
						class="pointer-events-none h-20 w-full -scale-y-100 sm:h-24"
					/>
					<div class="absolute inset-0 flex flex-col items-start justify-center pl-8 sm:pl-12">
						<p class="font-nikkyou text-[28px] tracking-tight text-[#e2beff] text-shadow-flat sm:text-[32px]">
							DEMO
						</p>
						<p class="font-nikkyou text-[14px] tracking-tight text-[#e2beff] text-shadow-flat opacity-80 sm:text-[16px]">
							Use the project!
						</p>
					</div>
				</a>
			{/if}
		</div>
	</div>

	<!-- Right Side -->
	<div class="relative mt-8 flex w-full grow flex-col items-center px-6 pb-48 sm:px-10 lg:mt-0 lg:items-end lg:px-0 lg:pb-0 lg:pt-0">
		<!-- Mobile: solid background -->
		<div class="absolute inset-0 bg-[#1c2c44] lg:hidden"></div>
		<!-- Desktop: tilted SVG panel -->
		<img
			src="/project/right-panel-bg.svg"
			alt=""
			class="pointer-events-none absolute -top-24 -right-32 hidden h-[120vh] w-[900px] -rotate-3 select-none lg:block"
		/>

		<!-- Right content overlay -->
		<div class="relative z-10 flex w-full flex-col gap-8 pt-10 sm:pt-12 lg:w-[400px] lg:gap-11 lg:pt-16 lg:pr-16">
			<!-- Description -->
			<div
				class="description-scroll prose max-h-[55vh] overflow-y-auto text-left font-jua text-xl leading-normal tracking-tight text-[#f2e2ff] prose-a:text-secondary prose-strong:text-[#f2e2ff] sm:text-2xl lg:text-right"
			>
				{@html data.descriptionHtml}
			</div>

			<!-- Action Buttons -->
			{#if isOwner}
				<div class="flex w-full items-center gap-1">
					{#if editing}
						<button
							class="flex h-[48px] grow cursor-pointer items-center justify-center gap-4 rounded-[20px] border-4 border-[#8b81ff] bg-[#1c2c44] px-4 shadow-md font-jua text-xl tracking-tight text-[#f2e2ff] lg:h-[53px] lg:text-2xl"
							onclick={cancelEdit}
						>
							Cancel
						</button>
					{/if}
					<button
						class="flex h-[48px] grow cursor-pointer items-center justify-center gap-4 rounded-[20px] border-4 border-[#8b81ff] bg-[#1c2c44] px-4 shadow-md hover-effect-shadow font-jua text-xl tracking-tight text-[#f2e2ff] lg:h-[53px] lg:text-2xl"
						onclick={startEdit}
						popovertarget="editProject"
					>
						<img src="/project/icon-edit.svg" alt="" class="h-5 w-5" />
						Edit
					</button>
					{#if showShipButton}
						<button
							class="flex h-[48px] grow cursor-pointer items-center justify-center gap-2.5 rounded-[20px] border-4 border-secondary bg-[#1c2c44] px-4 shadow-md hover-effect-shadow font-jua text-xl tracking-tight lg:h-[53px] lg:text-2xl"
							class:opacity-50={!canShip}
							popovertarget={canShip ? 'shipProject' : undefined}
							disabled={!canShip}
						>
							<img src="/project/icon-ship.svg" alt="" class="h-5 w-5" />
							<div class="relative">
								<span class="text-stroke text-stroke-1 bg-linear-to-r from-[#6EF5FB] to-[#938BEC] p-1">Ship</span>
								<span class="absolute top-0 left-0 bg-linear-to-b from-[#3E236D] to-[#42518E] bg-clip-text p-1 pt-0 text-transparent">Ship</span>
							</div>
						</button>
					{:else if data.pendingShips.length > 0}
						<button
							class="flex h-[48px] grow cursor-pointer items-center justify-center gap-2.5 rounded-[20px] border-4 border-secondary bg-[#1c2c44] px-4 shadow-md hover-effect-shadow font-jua text-xl tracking-tight text-[#f2e2ff] lg:h-[53px] lg:text-2xl"
							popovertarget="cancelShip"
						>
							Cancel Ship
						</button>
					{/if}
				</div>
			{/if}

			<!-- Ship History -->
			{#if isOwner && data.shipHistory.length > 0}
				<div class="flex w-full flex-col gap-3">
					<h2 class="font-jua text-xl tracking-tight text-[#f2e2ff] lg:text-right lg:text-2xl">
						Ship History
					</h2>
					{#each data.shipHistory as ship}
						{@const feedback = data.shipFeedback.filter((r) => r.shipId === ship.id)}
						<div class="rounded-xl border-2 border-[#8b81ff]/40 bg-[#1c2c44] p-3 font-jua">
							<div class="flex items-center justify-between">
								<span class="text-sm text-[#f2e2ff]">{formatHours(ship.seconds)}</span>
								<span
									class="text-sm"
									class:text-green-400={ship.status === 'APPROVED'}
									class:text-red-400={ship.status === 'REJECTED'}
									class:text-yellow-400={ship.status === 'PENDING' || ship.status === 'REVIEWER_APPROVED'}
								>
									{ship.status === 'REVIEWER_APPROVED' || ship.status === 'PENDING'
										? 'IN REVIEW'
										: ship.status}
								</span>
							</div>
							<p class="text-xs text-[#f2e2ff]/50">
								{new Date(ship.submittedAt).toLocaleDateString()}
							</p>
							{#each feedback as review}
								<div class="mt-2 border-t border-[#f2e2ff]/20 pt-2">
									<p class="text-sm text-[#f2e2ff]/90">
										{#if review.type === 'APPROVAL' || review.type === 'HQ_APPROVAL'}
											<span class="text-green-400">Approved:</span>
										{:else if review.type === 'REJECTION' || review.type === 'HQ_REJECTION'}
											<span class="text-red-400">Rejected:</span>
										{:else}
											<span class="text-[#f2e2ff]/70">Comment:</span>
										{/if}
										{review.userComment}
									</p>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.skew-btn {
		transition: transform 0.15s ease;
	}
	.skew-btn:hover {
		transform: translateX(12px);
	}

	.description-scroll {
		scrollbar-width: thin;
		scrollbar-color: #8b81ff transparent;
	}
	.description-scroll::-webkit-scrollbar {
		width: 6px;
	}
	.description-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.description-scroll::-webkit-scrollbar-thumb {
		background: #8b81ff;
		border-radius: 3px;
	}
	.description-scroll::-webkit-scrollbar-thumb:hover {
		background: #a59bff;
	}
</style>
