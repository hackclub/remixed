<script lang="ts">
	import BoldText from '$lib/BoldText.svelte';
	import { PROJECT_CATEGORY_OPTIONS } from '$lib';
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();

	let mounted = $state(false);
	onMount(() => requestAnimationFrame(() => (mounted = true)));

	const CATEGORY_META: Record<
		string,
		{ img: string; pathway: string; displayLabel: string; guideLink?: string }
	> = {
		RHYTHM_GAME: {
			img: '/landing/crunch_magenta.png',
			pathway: 'Pathway #1',
			displayLabel: 'rhythm game',
			guideLink: 'https://github.com/jollyroger182/rhythm-tutorial-godot',
		},
		AUDIO_EDITOR: {
			img: '/landing/crunch_yellow.png',
			pathway: 'Pathway #2',
			displayLabel: 'audio editor',
		},
		MUSIC_PLAYER: {
			img: '/landing/crunch_pink.png',
			pathway: 'Pathway #3',
			displayLabel: 'music player',
		},
		WILDCARD: {
			img: '/landing/crunch_sparkly.png',
			pathway: 'Wildcard',
			displayLabel: 'anything else',
		},
	};

	const CATEGORY_ORDER = ['RHYTHM_GAME', 'AUDIO_EDITOR', 'MUSIC_PLAYER', 'WILDCARD'];
	const CATEGORY_ROTATIONS: Record<string, number> = {
		RHYTHM_GAME: -3,
		AUDIO_EDITOR: 2,
		MUSIC_PLAYER: -2,
		WILDCARD: 3,
	};

	const sortedCategories = [...PROJECT_CATEGORY_OPTIONS].sort(
		(a, b) => CATEGORY_ORDER.indexOf(a.value) - CATEGORY_ORDER.indexOf(b.value),
	);

	let selectedCategory = $state(PROJECT_CATEGORY_OPTIONS[0].value);
	let selectedIndex = $derived(sortedCategories.findIndex((c) => c.value === selectedCategory));
	let hoveredIndex = $state(-1);

	function formatTime(seconds: number): string {
		if (seconds < 60) return '<1 min';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours === 0) return `${minutes}m`;
		if (minutes === 0) return `${hours}h`;
		return `${hours}h ${minutes}m`;
	}
</script>

<svelte:head>
	<title>Create New Project - Remixed</title>
</svelte:head>

<div class="relative z-2 flex w-full items-start justify-center px-4 pt-12 pb-12 sm:px-8">
	<form method="POST" class="flex w-full max-w-4xl flex-col gap-4 font-jua">
		<!-- Game title banner -->
		<div
			class="block-reveal relative overflow-hidden rounded-[2rem] border-4 border-[#8B81FF] bg-text px-8 py-7 shadow-2xl/30 sm:px-14 sm:py-9"
			class:revealed={mounted}
			style="--block-i:0; --block-stagger:100ms"
		>
			<!-- Decorative background grid -->
			<div
				class="pointer-events-none absolute inset-0 opacity-5"
				style="background-image: repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px);"
			></div>

			<div class="relative flex items-center gap-6">
				<!-- Joy-Con left stripe -->
				<div class="hidden flex-col gap-1.5 sm:flex" aria-hidden="true">
					<div class="h-3 w-3 rounded-full bg-secondary shadow-sm"></div>
					<div class="h-3 w-3 rounded-full bg-accent-purple shadow-sm"></div>
					<div class="h-3 w-3 rounded-full bg-primary shadow-sm"></div>
					<div class="h-3 w-3 rounded-full bg-accent-red shadow-sm"></div>
				</div>

				<div class="flex-1">
					<h1 class="font-daydream text-2xl text-[#E2BEFF] text-shadow-flat sm:text-4xl">
						Create Project
					</h1>
					<p class="mt-1 text-sm text-[#E2BEFF]/60 sm:text-base">
						All fields can be changed later!
					</p>
				</div>
			</div>
		</div>

		<!-- Step 01 — Title -->
		<div
			class="block-reveal rounded-[1.5rem] border-4 border-secondary/40 bg-text px-6 py-5 shadow-xl/20 transition-colors focus-within:border-secondary sm:px-8"
			class:revealed={mounted}
			style="--block-i:1; --block-stagger:100ms"
		>
			<div class="mb-3 flex items-center gap-3">
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-text"
				>
					01
				</div>
				<label class="text-2xl text-[#E2BEFF]" for="title">Title</label>
				<span class="ml-auto text-xs tracking-widest text-accent-red uppercase">Required</span>
			</div>
			<p class="mb-3 text-sm text-[#E2BEFF]/60">Give your project a cool name!</p>
			<input
				type="text"
				id="title"
				name="title"
				class="w-full rounded-xl border-2 border-[#8B81FF]/50 bg-[#0d1a2d] px-5 py-3 text-xl text-[#E2BEFF] transition-colors outline-none focus:border-secondary"
				required
			/>
		</div>

		<!-- Step 02 — Description -->
		<div
			class="block-reveal rounded-[1.5rem] border-4 border-accent-purple/40 bg-text px-6 py-5 shadow-xl/20 transition-colors focus-within:border-accent-purple sm:px-8"
			class:revealed={mounted}
			style="--block-i:2; --block-stagger:100ms"
		>
			<div class="mb-3 flex items-center gap-3">
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-purple text-xs font-bold text-text"
				>
					02
				</div>
				<label class="text-2xl text-[#E2BEFF]" for="desc">Description</label>
				<span class="ml-auto text-xs tracking-widest text-[#E2BEFF]/40 uppercase">Optional</span>
			</div>
			<p class="mb-3 text-sm text-[#E2BEFF]/60">Describe what your project is in detail.</p>
			<textarea
				id="desc"
				name="desc"
				rows="5"
				class="w-full resize-none rounded-xl border-2 border-[#8B81FF]/50 bg-[#0d1a2d] px-5 py-3 text-xl text-[#E2BEFF] transition-colors outline-none focus:border-accent-purple"
			></textarea>
		</div>

		<!-- Step 03 — Category -->
		<div
			class="block-reveal rounded-[1.5rem] border-4 border-primary/40 bg-text px-6 py-8 shadow-xl/20 sm:px-8 sm:pb-12"
			class:revealed={mounted}
			style="--block-i:3; --block-stagger:100ms"
		>
			<div class="mb-3 flex items-center gap-3">
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-text"
				>
					03
				</div>
				<span class="text-2xl text-[#E2BEFF]">Category</span>
			</div>
			<p class="mb-16 text-sm text-[#E2BEFF]/60">What kind of project are ya making?</p>

			<div class="flex justify-center overflow-visible">
				{#each sortedCategories as option, i}
					{@const meta = CATEGORY_META[option.value]}
					{@const selected = selectedCategory === option.value}
					{@const hovered = hoveredIndex === i && !selected}
					{@const rot = selected ? 0 : CATEGORY_ROTATIONS[option.value]}
					{@const txSelected = i < selectedIndex ? -28 : i > selectedIndex ? 28 : 0}
					{@const txHover =
						!selected && hoveredIndex !== -1
							? i < hoveredIndex
								? -14
								: i > hoveredIndex
									? 14
									: 0
							: 0}
					{@const tx = txSelected + txHover}
					{@const ty = hovered ? -10 : 0}
					{@const scale = selected ? 1.06 : hovered ? 1.04 : 1}
					<label
						class="w-44 flex-shrink-0 cursor-pointer"
						style="transform: rotate({rot}deg) translate({tx}px, {ty}px) scale({scale}); margin-left: {i ===
						0
							? '0'
							: '-18px'}; z-index: {selected
							? 10
							: hovered
								? 9
								: i}; transition: transform 0.25s ease;"
						onmouseenter={() => (hoveredIndex = i)}
						onmouseleave={() => (hoveredIndex = -1)}
					>
						<input
							type="radio"
							name="category"
							value={option.value}
							class="sr-only"
							bind:group={selectedCategory}
						/>
						<div
							class="rounded-2xl p-1 drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)] transition-colors duration-200 {selected
								? 'bg-linear-to-br from-primary to-[#8FD82A]'
								: 'bg-linear-to-br from-secondary to-[#53C1D7]'}"
						>
							<div
								class="relative flex flex-col items-center justify-center rounded-xl bg-text px-5 pt-24 pb-5"
							>
								<div
									class="pointer-events-none absolute -top-24 left-1/2 flex h-44 w-4/5 -translate-x-1/2 items-end justify-center"
								>
									<img
										src={meta.img}
										alt={meta.displayLabel}
										class="h-full w-full object-contain object-bottom"
									/>
								</div>
								<p
									class="text-center text-base leading-none tracking-widest text-[#E2BEFF]/50 uppercase"
								>
									{meta.pathway}
								</p>
								<BoldText class="text-center! font-jua text-2xl leading-tight">
									{meta.displayLabel}
								</BoldText>
								{#if meta.guideLink}
									<a
										href={meta.guideLink}
										target="_blank"
										rel="noopener noreferrer"
										class="mt-2 text-[#E2BEFF]/80 underline transition-colors hover:text-[#E2BEFF]"
										>(View Guide)</a
									>
								{/if}
							</div>
						</div>
					</label>
				{/each}
			</div>
		</div>

		<!-- Step 04 — Hackatime Projects -->
		<div
			class="block-reveal rounded-[1.5rem] border-4 border-accent-red/40 bg-text px-6 py-5 shadow-xl/20 transition-colors focus-within:border-accent-red sm:px-8"
			class:revealed={mounted}
			style="--block-i:4; --block-stagger:100ms"
		>
			<div class="mb-3 flex items-center gap-3">
				<div
					class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-red text-xs font-bold text-text"
				>
					04
				</div>
				<label class="text-2xl text-[#E2BEFF]" for="hackatime">Hackatime Projects</label>
			</div>
			<p class="mb-3 text-sm text-[#E2BEFF]/60">
				Select all projects that count towards this submission.
			</p>
			<div
				class="project-scroll max-h-72 overflow-y-auto rounded-xl border-2 border-[#8B81FF]/50 bg-[#0d1a2d] p-2"
			>
				{#if data.projects.length > 0}
					{#each data.projects as proj}
						<label
							class="group relative flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#E2BEFF]/5 has-[:checked]:bg-primary/10"
						>
							<input
								type="checkbox"
								name="hackatime_projects"
								value={proj.name}
								class="peer sr-only"
							/>
							<!-- Checkbox indicator -->
							<div
								class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2
									border-[#8B81FF]/50 bg-[#0d0f1a] transition-all
									peer-checked:border-primary peer-checked:bg-primary"
							>
								<svg
									class="h-3 w-3 text-text opacity-0 transition-opacity group-has-[:checked]:opacity-100"
									viewBox="0 0 12 10"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M1.5 5l3 3.5 6-8"
										stroke="currentColor"
										stroke-width="2.2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</div>
							<span class="flex-1 text-lg text-[#E2BEFF]">{proj.name}</span>
							<span class="font-mono text-sm text-[#E2BEFF]/40"
								>{formatTime(proj.totalSeconds)}</span
							>
						</label>
					{/each}
				{:else}
					<p class="px-4 py-6 text-center text-[#E2BEFF]/40">No projects found</p>
				{/if}
			</div>
		</div>

		<div
			class="block-reveal flex justify-center"
			class:revealed={mounted}
			style="--block-i:5; --block-stagger:100ms"
		>
			<button
				type="submit"
				class="hover-effect-shadow mx-auto mt-2 inline-flex cursor-pointer items-center gap-3 rounded-xl border-4 border-[#8B81FF] bg-text px-10 py-2 text-center text-2xl text-[#E2BEFF]"
			>
				<!-- Nintendo Switch (A) button -->
				<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
					<circle cx="14" cy="14" r="13" fill="#E2BEFF" />
					<text
						x="14"
						y="14"
						text-anchor="middle"
						dominant-baseline="central"
						font-family="Jua"
						font-size="16"
						fill="#1B2A42">A</text
					>
				</svg>
				Create Project
			</button>
		</div>
	</form>
</div>
