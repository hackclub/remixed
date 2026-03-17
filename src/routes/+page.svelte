<script lang="ts">
	import { env } from '$env/dynamic/public';
	import CrunchCard from '$lib/CrunchCard.svelte';
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
			item.xOffset += delta / 10.0;

			if (item.xOffset > window.innerWidth + 50) {
				item.xOffset -= window.innerWidth + ITEM_WIDTH + 100;
				// console.log('REMOVING', item.xOffset);
				// console.log(marqueeItems.pop().xOffset);
				// marqueeItems.unshift({
				// 	url: items[currentIndex].imageUrl,
				// 	name: items[currentIndex].name,
				// 	cost: items[currentIndex].cost,
				// 	rotation: Math.random() * 12.0 - 6.0,
				// 	vOffset: Math.random() * 16.0 - 8.0,
				// 	xOffset: 0,
				// });
				// currentIndex += 1;
				// currentIndex %= items.length;
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
	<!-- <img src="/landing/hueshift.png" alt="hueshift" class="absolute top-0 left-0 z-3 h-full w-full" /> -->
	<img src="/landing/dots-topleft.png" alt="dots" class="absolute top-0 left-0 z-2 w-1/2" />
	<img src="/landing/dots-right.png" alt="dots" class="absolute right-0 -bottom-64 z-2 w-1/2" />
	<img src="/landing/concentric.png" alt="ellipse" class="absolute top-0 z-1 h-full object-cover" />
	<div class="relative -top-8 z-5 flex -rotate-6 flex-col justify-center">
		<div class="relative flex min-w-500 justify-center bg-text">
			<img src="/logo.png" alt="logo" class="h-30" />
		</div>
		<div class="relative mx-auto mt-2 w-max text-center font-jua text-3xl">
			<h2 style="-webkit-text-stroke: 4px var(--color-light)" class="select-none">
				ship a rhythm game, get headphones!
			</h2>
			<h2
				class="absolute top-0 bg-linear-to-b from-[#3E236D] to-[#4470A4] bg-clip-text text-transparent"
			>
				ship a rhythm game, get headphones!
			</h2>
		</div>
		<button
			class="relative top-0 mx-auto mt-4 w-max cursor-pointer rounded-2xl bg-linear-to-r from-secondary to-[#54C1D7] p-1 shadow-none transition-all hover:-top-1 hover:shadow-lg/30 active:top-1 active:shadow-none"
		>
			<div class="rounded-xl bg-text px-24 py-2">
				<div class="relative font-jua text-3xl">
					<span class="text-stroke bg-linear-to-r from-[#6EF5FB] to-[#938BEC] p-1">
						join now!
					</span>
					<span
						class="absolute top-0 left-0 bg-linear-to-b from-[#3E236D] to-[#42518E] bg-clip-text p-1 pt-0 text-transparent"
						>join now!</span
					>
				</div>
			</div>
		</button>
	</div>
</div>
<div class="relative pb-150">
	<div class="relative z-2">
		<div class="relative flex justify-center text-center font-jua text-3xl">
			<h1 class="text-stroke bg-light">Choose a pathway and, get music-related goodies!</h1>
			<h1 class="text-dark-gradient absolute top-0 p-1">
				Choose a pathway and, get music-related goodies!
			</h1>
		</div>
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
		<div class="relative flex justify-center text-center font-jua text-3xl">
			<h1 class="text-stroke bg-light">
				...or make something completely different, as long as it’s about music!
			</h1>
			<h1 class="text-dark-gradient absolute top-0 p-1">
				...or make something completely different, as long as it’s about music!
			</h1>
		</div>
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
	<div
		class="absolute z-6 flex w-1000 rotate-12 justify-center gap-8 bg-text p-4 text-3xl text-light"
	>
		<h1>MICROPHONES</h1>
		<h1>HEADPHONES</h1>
		<h1>INSTRUMENTS</h1>
	</div>
	<div
		class="absolute top-2 z-5 flex h-200 w-1000 rotate-12 justify-center gap-8 bg-accent-red pt-32"
	>
		<div class="">
			<div class="relative flex justify-center font-jua text-3xl">
				<h1 class="text-stroke bg-light">Ship your project, and get all sorts of cool stuff!</h1>
				<h1 class="text-dark-gradient absolute top-0 p-1">
					Ship your project, and get all sorts of cool stuff!
				</h1>
			</div>
			<div class="flex justify-center">
				<div class="marquee absolute mt-36 flex w-screen justify-start">
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
<div class="relative z-1 h-200 w-full bg-accent-purple"></div>
