<script lang="ts">
	import { env } from '$env/dynamic/public';

	let hackatimeOauthUrl =
		'https://hackatime.hackclub.com/oauth/authorize?' +
		new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID!,
			redirect_uri: env.PUBLIC_CALLBACK_URL!,
			response_type: 'code',
		}).toString();
</script>

<a href={hackatimeOauthUrl} class="fixed">LOGIN</a>
<div
	class="relative flex h-screen w-screen items-center justify-center overflow-clip bg-accent-purple"
>
	<img src="/landing/dots-topleft.png" alt="dots" class="absolute top-0 left-0 z-2 w-1/2" />
	<img src="/landing/dots-right.png" alt="dots" class="absolute right-0 -bottom-64 z-2 w-1/2" />
	<img src="/landing/concentric.png" alt="ellipse" class="absolute top-0 z-1 h-full object-cover" />
	<div class="relative -top-8 z-3 flex -rotate-6 flex-col justify-center">
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
			<div class="rounded-2xl bg-text px-24 py-2">
				<div class="relative font-jua text-3xl">
					<span
						style="-webkit-text-stroke: 4px transparent;"
						class=" bg-linear-to-r from-[#6EF5FB] to-[#938BEC] bg-clip-text p-1 text-transparent select-none"
					>
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
<div class="h-40"></div>
