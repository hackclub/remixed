<script lang="ts">
	import { env } from '$env/dynamic/public';
	import CrunchCard from '$lib/CrunchCard.svelte';

	let hackatimeOauthUrl =
		'https://hackatime.hackclub.com/oauth/authorize?' +
		new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID!,
			redirect_uri: env.PUBLIC_CALLBACK_URL!,
			response_type: 'code',
		}).toString();
</script>

<a href={hackatimeOauthUrl} class="fixed">LOGIN</a>
<div class="fixed h-screen w-screen bg-accent-purple"></div>
<div
	class="relative flex h-screen w-screen items-center justify-center overflow-clip bg-accent-purple"
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
<div class="relative h-300">
	<div class="relative z-2 flex flex-col gap-16">
		<div class="relative flex justify-center text-center font-jua text-3xl">
			<h1 class="text-stroke bg-light">Choose a pathway and, get music-related goodies!</h1>
			<h1 class="text-dark-gradient absolute top-0 p-1">
				Choose a pathway and, get music-related goodies!
			</h1>
		</div>
		<div class="flex justify-center gap-16 p-16">
			<CrunchCard
				img="/landing/crunch_pink.png"
				h2="PATHWAY #1"
				h1="Rhythm Game"
				class="top-4 rotate-6"
			/>
			<CrunchCard
				img="/landing/crunch_green_spotify.png"
				h2="PATHWAY #2"
				h1="Audio Editor"
				class="-top-4 -rotate-6"
			/>
			<CrunchCard
				img="/landing/crunch_pink.png"
				h2="PATHWAY #3"
				h1="Music Player"
				class=" rotate-6"
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
		<div class="mt-8 flex justify-center">
			<CrunchCard
				img="/landing/crunch_green_spotify.png"
				h2="WILDCARD"
				h1="Anything else!"
				class=""
			/>
		</div>
	</div>
	<div class="absolute -top-40 z-0 w-full">
		<div
			class="h-200 w-full mask-[url(/landing/dots-mask-main.png)] mask-contain mask-repeat-x"
			style="background: repeating-linear-gradient(-70deg, #7dd9d9, #7dd9d9 8px, #4ab5d0 8px, #4ab5d0 18px);"
		></div>
		<div
			style="background: repeating-linear-gradient(-70deg, #7dd9d9, #7dd9d9 8px, #4ab5d0 8px, #4ab5d0 18px);"
			class="h-200 w-full"
		></div>
	</div>
</div>
