<script lang="ts">
	import { env } from '$env/dynamic/public';
	import CrunchCard from '$lib/CrunchCard.svelte';
	import BoldText from '$lib/BoldText.svelte';
	import FAQCard from '$lib/FAQCard.svelte';
	import { onMount } from 'svelte';

	const ITEM_WIDTH = 180.0;
	let currentIndex = 0;
	let items: any[] = $state([]);
	let marqueeItems: any = $state([]);

	let hackatimeOauthUrl =
		'https://hackatime.hackclub.com/oauth/authorize?' +
		new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID!,
			redirect_uri: env.PUBLIC_CALLBACK_URL!,
			response_type: 'code',
		}).toString();

	onMount(() => {
		fetch('/api/shop')
			.then((resp) => resp.json())
			.then((r) => {
				items = r;
				fillMarquee();
			});
	});

	function fillMarquee() {
		for (let i = 0; i < Math.ceil(window.innerWidth / ITEM_WIDTH) + 1; i++) {
			marqueeItems.push({
				url: items[currentIndex].imageUrl,
				name: items[currentIndex].name,
				cost: items[currentIndex].cost,
				rotation: Math.random() * 12.0 - 6.0,
				vOffset: Math.random() * 16.0 - 8.0,
				xOffset: i * ITEM_WIDTH - ITEM_WIDTH - 50.0,
			});
			currentIndex += 1;
			currentIndex %= items.length;
		}
		console.log(marqueeItems);
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

<a href={hackatimeOauthUrl} class="fixed">LOGIN</a>
<div class="fixed h-screen w-screen bg-accent-purple"></div>
<div
	class="relative flex h-screen w-screen items-center justify-center overflow-x-clip bg-accent-purple"
>
	<img src="/landing/dots-topleft.png" alt="dots" class="absolute top-0 left-0 z-2 w-1/2" />
	<img src="/landing/dots-right.png" alt="dots" class="absolute right-0 -bottom-64 z-2 w-1/2" />
	<img src="/landing/concentric.png" alt="ellipse" class="absolute top-0 z-1 h-full object-cover" />
	<div class="relative -top-8 z-5 flex -rotate-6 flex-col justify-center">
		<div class="relative flex min-w-500 justify-center bg-text">
			<img src="/logo.png" alt="logo" class="h-30" />
		</div>
		<BoldText class="mx-auto mt-4 text-center font-jua text-3xl" stroke="2">
			ship a rhythm game, get headphones!
		</BoldText>
		<a
			href={hackatimeOauthUrl}
			class="relative top-0 mx-auto mt-4 w-max cursor-pointer rounded-2xl bg-linear-to-r from-secondary to-[#54C1D7] p-1 shadow-none transition-all hover:-top-1 hover:shadow-lg/30 active:top-1 active:shadow-none"
		>
			<div class="rounded-xl bg-text px-24 py-2">
				<div class="relative font-jua text-3xl">
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

<div class="relative -top-110 flex justify-center overflow-x-clip">
	<div class="absolute z-6 flex w-1000 rotate-12 justify-center bg-text p-4">
		<BoldText class="font-daydream text-4xl" stroke="2">
			/// MICROPHONES /// HEADPHONES /// INSTRUMENTS ///
		</BoldText>
	</div>
	<div class="relative top-2 z-5 flex w-1000 rotate-12 justify-center gap-8 pt-32">
		<img
			src="/landing/dots-marquee-left.png"
			alt="dots"
			class="absolute top-0 -left-4 z-1 h-full -rotate-12"
		/>
		<img
			src="/landing/dots-marquee-right.png"
			alt="dots"
			class="absolute -right-16 bottom-0 z-1 h-full -rotate-12"
		/>
		<div class="absolute top-16 h-full w-1000 bg-accent-purple"></div>
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

<div class="relative -top-160 z-5 w-full">
	<img src="/landing/faq-bg.png" alt="bg" class="absolute w-full scale-x-[-1]" />
	<div class="relative z-8 mx-auto max-w-5xl p-8 pt-64">
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
</div>

<div class="relative z-8 -mt-120 w-full overflow-x-clip bg-text">
	<div class="flex justify-center">
		<div class="absolute -top-20 h-40 w-1000 -rotate-6 bg-text"></div>
	</div>
	<div class="relative mx-auto max-w-5xl p-16">
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
			Hack Club is a 501(c)(3) nonprofit and network of 60k+ technical high schoolers. We believe
			you learn best by building so we're creating community and providing grants so you can make
			awesome projects. In the past few years, we've partnered with GitHub to run Summer of
			Making, hosted the world's longest hackathon on land, and ran Canada's largest high school
			hackathon. <br /><br /> At Hack Club, students aren't just learning, they're shipping.
		</p>
	</div>
</div>
