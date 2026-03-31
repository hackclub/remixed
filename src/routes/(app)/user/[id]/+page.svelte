<script lang="ts">
	import BoldText from '$lib/BoldText.svelte';
	import CoverArt from '$lib/CoverArt.svelte';
	import ProjectCard from '$lib/ProjectCard.svelte';
	import { formatHours } from '$lib';
	import { styleButton, styleH2 } from '$lib/styles';
	import { onMount } from 'svelte';

	let { data } = $props();

	let anim = $state(false);
	let copied = $state(false);

	const isOwner = data.currentUser?.id === data.user.id;

	const memberSince = new Date(data.user.createdAt).toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
	});

	const roleBadges = data.user.roles.filter((r: string) => r !== 'USER');

	function copyReferral() {
		navigator.clipboard.writeText(`https://remixed.hackclub.com/?ref=${data.user.id}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	onMount(() => {
		requestAnimationFrame(() => (anim = true));
	});
</script>

<svelte:head>
	<title>{data.user.username} - Remixed</title>
</svelte:head>

<div class="relative min-h-screen overflow-hidden px-6 pt-10 pb-48 sm:px-10 lg:px-20 lg:pt-16">
	<!-- Hero Section -->
	<div class="mx-auto flex max-w-4xl flex-col items-center gap-6">
		<!-- Avatar with disc -->
		<div class="relative shrink-0 anim-avatar" class:anim-active={anim}>
			<img
				src="/project/disc.png"
				alt=""
				class="absolute top-2 left-[45%] z-0 aspect-square w-48 object-cover sm:w-56 lg:w-64 anim-disc"
				class:anim-active={anim}
			/>
			<div class="relative z-10">
				<CoverArt
					src={data.user.avatarUrl}
					class="h-40 w-40 rounded-2xl border-4 border-[#8B81FF] shadow-lg sm:h-48 sm:w-48 lg:h-56 lg:w-56"
				/>
			</div>
		</div>

		<!-- Username -->
		<div class="anim-name" class:anim-active={anim}>
			<BoldText class="font-jua text-4xl tracking-tight sm:text-5xl lg:text-6xl" stroke="2">
				@{data.user.username}
			</BoldText>
		</div>

		<!-- Own profile actions -->
		{#if isOwner}
			<div class="flex flex-wrap items-center justify-center gap-3 anim-actions" class:anim-active={anim}>
				<button class="{styleButton} !px-8 !py-1 !text-lg" onclick={copyReferral}>
					{copied ? 'Copied!' : 'Copy Referral Link'}
				</button>
				<a href="/auth/logout" class="{styleButton} !px-8 !py-1 !text-lg">Log Out</a>
			</div>
		{/if}

		<!-- Role badges -->
		{#if roleBadges.length > 0}
			<div class="flex flex-wrap justify-center gap-2 anim-badges" class:anim-active={anim}>
				{#each roleBadges as role}
					<span
						class="rounded-full border-2 border-secondary bg-[#1c2c44] px-4 py-1 font-gothic text-sm tracking-wider text-secondary shadow-md"
					>
						{role}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Stats -->
		<div class="mt-2 flex flex-wrap justify-center gap-3 anim-stats" class:anim-active={anim}>
			<div class="flex flex-col items-center rounded-2xl border-3 border-[#8B81FF] bg-[#1c2c44] px-5 py-3 shadow-md">
				<span class="font-jua text-2xl text-[#E2BEFF]">{data.user.notesBalance}</span>
				<span class="font-gothic text-xs tracking-wider text-[#E2BEFF]/70">NOTES</span>
			</div>
			<div class="flex flex-col items-center rounded-2xl border-3 border-[#8B81FF] bg-[#1c2c44] px-5 py-3 shadow-md">
				<span class="font-jua text-2xl text-[#E2BEFF]">{formatHours(data.totalApprovedSeconds)}</span>
				<span class="font-gothic text-xs tracking-wider text-[#E2BEFF]/70">SHIPPED</span>
			</div>
			<div class="flex flex-col items-center rounded-2xl border-3 border-[#8B81FF] bg-[#1c2c44] px-5 py-3 shadow-md">
				<span class="font-jua text-2xl text-[#E2BEFF]">{data.userProjects.length}</span>
				<span class="font-gothic text-xs tracking-wider text-[#E2BEFF]/70">PROJECTS</span>
			</div>
			<div class="flex flex-col items-center rounded-2xl border-3 border-[#8B81FF] bg-[#1c2c44] px-5 py-3 shadow-md">
				<span class="font-jua text-2xl text-[#E2BEFF]">{memberSince}</span>
				<span class="font-gothic text-xs tracking-wider text-[#E2BEFF]/70">JOINED</span>
			</div>
			{#if data.user.referrals > 0 || isOwner}
				<div class="flex flex-col items-center rounded-2xl border-3 border-[#8B81FF] bg-[#1c2c44] px-5 py-3 shadow-md">
					<span class="font-jua text-2xl text-[#E2BEFF]">{data.user.referrals}</span>
					<span class="font-gothic text-xs tracking-wider text-[#E2BEFF]/70">REFERRALS</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Projects Section -->
	<div class="mx-auto mt-16 max-w-6xl anim-projects" class:anim-active={anim}>
		<h2 class="mb-2 text-left text-text">
			<BoldText class="font-jua text-3xl sm:text-4xl" stroke="1">Projects</BoldText>
		</h2>
		<p class="mb-8 font-jua text-lg text-white">
			{data.userProjects.length} project{data.userProjects.length !== 1 ? 's' : ''} &bull; {formatHours(data.totalApprovedSeconds)} shipped
		</p>
		{#if data.userProjects.length > 0}
			<div class="flex flex-row flex-wrap justify-start gap-8">
				{#each data.userProjects as proj}
					<ProjectCard {proj} />
				{/each}
			</div>
		{:else}
			<p class="text-left font-jua text-xl text-[#E2BEFF]/70">
				{data.user.username} doesn't have any projects yet!
			</p>
		{/if}
	</div>
</div>

<style>
	@keyframes avatar-enter {
		from { opacity: 0; transform: translateY(40px) scale(0.9); }
		to { opacity: 1; transform: translateY(0) scale(1); }
	}
	@keyframes disc-enter {
		from { transform: translateY(60px) rotate(0deg); opacity: 0; }
		to { transform: translateY(0) rotate(-110deg); opacity: 1; }
	}
	@keyframes fade-up {
		from { opacity: 0; transform: translateY(24px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.anim-avatar {
		opacity: 0;
		transform: translateY(40px) scale(0.9);
	}
	.anim-avatar.anim-active {
		animation: avatar-enter 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.anim-disc {
		opacity: 0;
		transform: translateY(60px) rotate(0deg);
	}
	.anim-disc.anim-active {
		animation: disc-enter 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}

	.anim-name {
		opacity: 0;
		transform: translateY(24px);
	}
	.anim-name.anim-active {
		animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
	}

	.anim-badges {
		opacity: 0;
		transform: translateY(24px);
	}
	.anim-badges.anim-active {
		animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
	}

	.anim-stats {
		opacity: 0;
		transform: translateY(24px);
	}
	.anim-stats.anim-active {
		animation: fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s forwards;
	}

	.anim-projects {
		opacity: 0;
		transform: translateY(24px);
	}
	.anim-projects.anim-active {
		animation: fade-up 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
	}

	.anim-actions {
		opacity: 0;
	}
	.anim-actions.anim-active {
		animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.7s forwards;
	}
</style>
