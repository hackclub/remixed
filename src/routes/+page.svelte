<script lang="ts">
	import CrunchCard from '$lib/CrunchCard.svelte';
	import BoldText from '$lib/BoldText.svelte';
	import FAQCard from '$lib/FAQCard.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	const PROJECT_IDEAS = ['rhythm game', 'daw', 'vst'];
	const REWARD_IDEAS = ['headphones', 'a microphone', 'a speaker', 'an instrument'];
	const STRIP_LABEL = '/// MICROPHONES /// HEADPHONES /// INSTRUMENTS /// RHYTHM GAMES /// AUDIO INTERFACES';
	const HERO_TEXT_POP_DURATION = 320;
	const HERO_TEXT_SWAP_DELAY = 60;

	const ITEM_WIDTH = 180.0;
	let currentProjectIdea = $state(0);
	let currentRewardIdea = $state(0);
	let projectTurn = true;
	let heroTextPopping = $state(false);
	let currentIndex = 0;
	let items: any[] = $state([]);
	let marqueeItems: any = $state([]);
	let heroTextInterval: ReturnType<typeof setInterval> | undefined;
	let heroTextSwapTimeout: ReturnType<typeof setTimeout> | undefined;
	let heroTextResetTimeout: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		heroTextInterval = setInterval(changeIdeas, 2000);
		fetch('/api/shop')
			.then((resp) => resp.json())
			.then((r) => {
				items = r;
				fillMarquee();
			});

		return () => {
			clearInterval(heroTextInterval);
			clearTimeout(heroTextSwapTimeout);
			clearTimeout(heroTextResetTimeout);
		};
	});

	function changeIdeas() {
		let nextProjectIdea = currentProjectIdea;
		let nextRewardIdea = currentRewardIdea;

		if (projectTurn) {
			while (nextProjectIdea === currentProjectIdea) {
				nextProjectIdea = Math.floor(Math.random() * PROJECT_IDEAS.length);
			}
		} else {
			while (nextRewardIdea === currentRewardIdea) {
				nextRewardIdea = Math.floor(Math.random() * REWARD_IDEAS.length);
			}
		}

		heroTextPopping = false;
		clearTimeout(heroTextSwapTimeout);
		clearTimeout(heroTextResetTimeout);

		requestAnimationFrame(() => {
			heroTextPopping = true;

			heroTextSwapTimeout = setTimeout(() => {
				currentProjectIdea = nextProjectIdea;
				currentRewardIdea = nextRewardIdea;
				projectTurn = !projectTurn;
			}, HERO_TEXT_SWAP_DELAY);

			heroTextResetTimeout = setTimeout(() => {
				heroTextPopping = false;
			}, HERO_TEXT_POP_DURATION);
		});
	}

	function fillMarquee() {
		for (let i = 0; i < Math.ceil(window.innerWidth / ITEM_WIDTH) + 1; i++) {
			marqueeItems.push({
				url: items[currentIndex].imageUrl,
				name: items[currentIndex].name,
				cost: items[currentIndex].cost,
				rotation: Math.random() * 15.0 - 6.0,
				vOffset: Math.random() * 16.0 - 8.0,
				xOffset: i * ITEM_WIDTH - ITEM_WIDTH - 50.0,
			});
			currentIndex += 1;
			currentIndex %= items.length;
		}
		requestAnimationFrame(update);
	}

	let lastFrame = 0;
	function update(currentFrame: number) {
		let delta = currentFrame - lastFrame;
		lastFrame = currentFrame;

		for (const item of marqueeItems) {
			item.xOffset += delta / 20.0;

			if (item.xOffset > window.innerWidth + 50) {
				item.xOffset -= window.innerWidth + ITEM_WIDTH + 100;
			}
		}

		requestAnimationFrame(update);
	}
</script>

<svelte:head>
	<title>Remixed</title>
	<meta
		property="og:description"
		content="ship something music related, get something music related!"
	/>
	<meta property="og:image" content="/logo.png" />
</svelte:head>

<div class="fixed h-screen w-screen bg-accent-purple"></div>
<div
	class="relative flex h-screen w-screen items-center justify-center overflow-x-clip bg-accent-purple"
>
	<img src="/landing/dots-topleft.png" alt="" class="absolute top-0 left-0 z-2 w-1/2" />
	<img src="/landing/dots-right.png" alt="" class="absolute right-0 -bottom-64 z-2 w-1/2" />
	<img src="/landing/concentric.png" alt="" class="absolute top-0 z-1 h-full object-cover" />
	<div class="relative -top-8 z-5 flex -rotate-6 flex-col justify-center w-screen scale-105">
		<div class="relative flex justify-center bg-text">
			<img src="/logo.png" alt="logo" class="h-30" />
		</div>
		<div class="hero-copy mx-auto mt-4 w-max" class:hero-copy-pop={heroTextPopping}>
			<BoldText class="text-center font-jua text-3xl" stroke="2">
				ship a {PROJECT_IDEAS[currentProjectIdea]}, get {REWARD_IDEAS[currentRewardIdea]}!
			</BoldText>
		</div>
		{#if data.authError}
			<p
				class="mx-auto mt-4 w-max max-w-[32rem] rounded-2xl border-4 border-text bg-light px-6 py-3 text-center font-jua text-xl text-text"
			>
				{data.authError}
			</p>
		{/if}
		<a
			href="/auth/hca"
			class="relative top-0 mx-auto mt-4 w-max cursor-pointer rounded-2xl bg-linear-to-r from-secondary to-[#54C1D7] p-1 shadow-none transition-all hover:-top-1 hover:shadow-lg/30 active:top-1 active:shadow-none"
		>
			<div class="rounded-xl bg-text px-8 py-2 md:px-16">
				<div class="relative font-jua text-xl md:text-3xl">
					<span class="text-stroke text-stroke-1 bg-linear-to-r from-[#6EF5FB] to-[#938BEC] p-1">
						join now!
					</span>
					<span
						class="absolute top-0 left-0 bg-linear-to-b from-[#3E236D] to-[#42518E] bg-clip-text p-1 pt-0 text-transparent"
						>join now!</span
					>
				</div>
			</div>
		</a>
	</div>
</div>
<div class="relative pb-150">
	<div class="relative z-2">
		<BoldText class="mx-auto flex! w-full font-jua text-3xl" stroke="2">
			Choose a pathway and, get music-related goodies!
		</BoldText>
		<div class="mt-24 flex justify-center gap-16 p-16">
			<CrunchCard
				img="/landing/crunch_pink.png"
				h2="PATHWAY #1"
				h1="Rhythm Game"
				class="relative top-4 rotate-6"
			/>
			<CrunchCard
				img="/landing/crunch_green_spotify.png"
				h2="PATHWAY #2"
				h1="Audio Editor"
				class="relative -top-4 -rotate-6"
			/>
			<CrunchCard
				img="/landing/crunch_pink.png"
				h2="PATHWAY #3"
				h1="Music Player"
				class=" relative rotate-6"
			/>
		</div>

		<BoldText class="mx-auto flex! w-full font-jua text-3xl" stroke="2">
			...or make something completely different, as long as it’s about music!
		</BoldText>
		<div class="mt-36 flex justify-center">
			<CrunchCard
				img="/landing/crunch_green_spotify.png"
				h2="WILDCARD"
				h1="Anything else!"
				class="relative"
			/>
		</div>
	</div>
	<div class="absolute -top-40 z-0 h-full w-full">
		<div
			class="h-full w-full mask-[url(/landing/dots-mask-main.png)] mask-contain mask-repeat-x"
			style="background: repeating-linear-gradient(-70deg, #7dd9d9, #7dd9d9 8px, #4ab5d0 8px, #4ab5d0 18px), red; mask-size: auto auto;"
		></div>
	</div>
</div>

<div class="relative -mt-110 flex justify-center overflow-x-clip pb-40 md:pb-56">
	<div
		class="absolute left-1/2 z-6 w-[calc(100vw+16rem)] -translate-x-1/2 rotate-12 overflow-hidden bg-text p-4"
	>
		<div class="strip-marquee" aria-label={STRIP_LABEL}>
			<div class="strip-marquee__segment">
				<BoldText class="font-daydream text-4xl" stroke="2">{STRIP_LABEL}</BoldText>
			</div>
			<div class="strip-marquee__segment" aria-hidden="true">
				<BoldText class="font-daydream text-4xl" stroke="2">{STRIP_LABEL}</BoldText>
			</div>
		</div>
	</div>
	<div
		class="relative top-2 z-5 flex w-[calc(100vw+16rem)] rotate-12 justify-center gap-8 pt-32"
	>
		<img
			src="/landing/dots-marquee-left.png"
			alt="dots"
			class="absolute -top-8 -left-12 z-1 h-[125%] max-w-none -rotate-12 md:-top-12 md:-left-20 md:h-[145%]"
		/>
		<img
			src="/landing/dots-marquee-right.png"
			alt="dots"
			class="absolute -right-24 -bottom-10 z-1 h-[125%] max-w-none -rotate-12 md:-right-32 md:-bottom-14 md:h-[145%]"
		/>
		<div class="absolute top-16 h-full w-full bg-accent-purple"></div>
		<div class="">
			<BoldText class="z-3 mx-auto flex! font-jua text-4xl" stroke="2">
				Ship your project, and get all sorts of cool stuff!
			</BoldText>
			<div class="flex justify-center">
				<div class="marquee relative z-6 mt-48 flex h-100 w-screen justify-start">
					{#each marqueeItems as item}
						<CrunchCard
							img={item.url}
							h2="{item.cost} notes"
							h1={item.name}
							class="absolute"
							style="rotate: {item.rotation}deg; top: {item.yOffset}px; left: {item.xOffset}px"
						/>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.strip-marquee {
		display: flex;
		width: max-content;
		will-change: transform;
		animation: strip-marquee-scroll 18s linear infinite;
	}

	.strip-marquee__segment {
		flex: 0 0 auto;
		padding-right: 1em;
	}

	@keyframes strip-marquee-scroll {
		from {
			transform: translateX(-50%);
		}

		to {
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-copy-pop {
			animation: none;
		}

		.strip-marquee {
			animation: none;
			transform: translateX(0);
		}
	}

	.hero-copy {
		transform-origin: center;
	}

	.hero-copy-pop {
		animation: hero-copy-pop 320ms both;
	}

	@keyframes hero-copy-pop {
		0% {
			transform: scale(1);
			animation-timing-function: cubic-bezier(0.18, 0.95, 0.35, 1);
		}

		28% {
			transform: scale(1.12);
			animation-timing-function: cubic-bezier(0.12, 0, 0.22, 1);
		}

		100% {
			transform: scale(1);
		}
	}
</style>

<div class="relative -mt-48 z-5 w-full md:-mt-72">
	<img
		src="/landing/faq-bg.png"
		alt="bg"
		class="absolute inset-0 h-full w-full object-cover object-top scale-x-[-1]"
	/>
	<div class="relative z-8 mx-auto max-w-5xl p-8 pt-64 pb-48">
		<BoldText class="font-jua text-9xl" stroke="4">FAQ</BoldText>
		<BoldText class="mb-8 flex! font-jua text-4xl" stroke="2">
			(Frequently Asked Questions)
		</BoldText>
		<div class="flex flex-row flex-wrap gap-8">
			<FAQCard title="Who is eligible?">
				<p class="font-jua text-xl text-light">
					Remixed is eligible for highschoolers! You need to be 13-18 years old to participate.
				</p>
			</FAQCard>
			<FAQCard title="How do I track my time?">
				<p class="font-jua text-xl text-light">
					We use our very own <a
						href="https://hackatime.hackclub.com/"
						class="text-[#81E2E1] underline decoration-wavy decoration-2">Hackatime</a
					>
					and
					<a
						href="https://lapse.hackclub.com/"
						class="text-[#81E2E1] underline decoration-wavy decoration-2">Lapse</a
					> to track your time! The more time you spend, the more notes you get.
				</p>
			</FAQCard>
			<FAQCard title="Is this legit?">
				<p class="font-jua text-xl text-light">
					Yep! Hack Club has ran many different programs before, partnering with
					<a
						href="https://www.amd.com/en.html"
						class="text-[#81E2E1] underline decoration-wavy decoration-2"
					>
						AMD
					</a>,
					<a
						href="https://opensauce.com/"
						class="text-[#81E2E1] underline decoration-wavy decoration-2"
					>
						Open Sauce
					</a>,
					<a
						href="https://github.com/"
						class="text-[#81E2E1] underline decoration-wavy decoration-2"
					>
						GitHub
					</a>, and
					<a
						href="https://hackclub.com/philanthropy/"
						class="text-[#81E2E1] underline decoration-wavy decoration-2"
					>
						many more
					</a>.
				</p>
			</FAQCard>
			<FAQCard title="When does this end?">
				<p class="font-jua text-xl text-light">
					(INSERT DATE HERE)! You will have a couple of weeks to redeem your prizes after it ends,
					though.
				</p>
			</FAQCard>
		</div>
	</div>

	<div class="relative z-8 w-full overflow-x-clip bg-text">
		<div
			class="absolute left-1/2 -top-24 h-48 w-[calc(100vw+16rem)] -translate-x-1/2 -rotate-6 bg-text"
		></div>
		<div class="relative mx-auto max-w-5xl p-16 pt-28 pb-32">
			<h1 class="mb-8 font-jua text-4xl text-light">
				A project by
				<BoldText stroke="2">Hack Club</BoldText>, built by
				<BoldText stroke="2">kc</BoldText>,
				<BoldText stroke="2">fireentity</BoldText>,
				<BoldText stroke="2">helloonearth311</BoldText>,
				<BoldText stroke="2">ascpixi</BoldText>, and
				<BoldText stroke="2">Shuflduf</BoldText>.
			</h1>
			<p class="font-jua text-xl text-light">
				Hack Club is a 501(c)(3) nonprofit and network of 60k+ technical high schoolers. We
				believe you learn best by building so we're creating community and providing grants so you
				can make awesome projects. In the past few years, we've partnered with GitHub to run
				Summer of Making, hosted the world's longest hackathon on land, and ran Canada's largest
				high school hackathon. <br /><br /> At Hack Club, students aren't just learning, they're
				shipping.
			</p>
		</div>
	</div>
</div>
