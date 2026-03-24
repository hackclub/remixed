<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Connect Hackatime - Remixed</title>
</svelte:head>

<div
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-accent-purple px-6 py-16"
>
	<img src="/landing/dots-topleft.png" alt="" class="absolute top-0 left-0 z-0 w-1/2" />
	<img src="/landing/dots-right.png" alt="" class="absolute right-0 bottom-0 z-0 w-1/2" />
	<div
		class="relative z-10 mx-auto flex max-w-3xl flex-col gap-6 rounded-[2rem] bg-text p-8 shadow-[0_0_0_4px_var(--color-text),0_24px_0_0_rgba(27,42,66,0.15)] md:p-12"
	>
		<p class="font-daydream text-xl text-[#E2BEFF]">ONE MORE STEP!</p>
		<div class="space-y-4">
			<h1 class="font-gothic text-4xl text-[#E2BEFF] md:text-5xl">Connect Hackatime</h1>
			<p class="font-jua text-2xl text-[#E2BEFF]">
				Connect Hackatime so Remixed can verify the time attached to your projects.
			</p>
		</div>

		{#if data.errorMessage}
			<p
				class="rounded-2xl border-4 border-accent-red bg-[#FFE6EE] px-5 py-4 font-jua text-xl text-text"
			>
				{data.errorMessage}
			</p>
		{/if}

		<div class="flex flex-col gap-4 sm:flex-row">
			<a
				href="/auth/hackatime/start"
				class="inline-flex items-center justify-center rounded-2xl border-4 border-[#E2BEFF] bg-text px-8 py-4 font-jua text-2xl text-[#E2BEFF] shadow-2xl transition-transform hover:-translate-y-1"
			>
				Connect Hackatime
			</a>
			<a
				href="/auth/logout"
				class="inline-flex items-center justify-center rounded-2xl border-4 border-[#E2BEFF] bg-text px-8 py-4 font-jua text-2xl text-[#E2BEFF] shadow-2xl transition-transform hover:-translate-y-1"
			>
				Log Out
			</a>
		</div>
	</div>
</div>
