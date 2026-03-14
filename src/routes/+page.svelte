<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { records } from '$lib/records';

	let hackatimeOauthUrl =
		'https://hackatime.hackclub.com/oauth/authorize?' +
		new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID!,
			redirect_uri: env.PUBLIC_CALLBACK_URL!,
			response_type: 'code',
		}).toString();
	let selectedIndex: number | null = $state(null);
	const expandAmount = 300;

	function getRecordTop(i: number) {
		return i * 60 + (selectedIndex !== null && i > selectedIndex ? expandAmount : 0);
	}

	function getSleeveTop() {
		return records.length * 60 + (selectedIndex !== null ? expandAmount : 0);
	}
</script>

<a href={hackatimeOauthUrl}>LOGIN</a>
<div class="relative mt-16 flex w-screen justify-center">
	{#each records as record, i}
		<button
			class="absolute flex h-200 w-200 cursor-pointer flex-col items-center gap-16 rounded-full pt-4 transition-all duration-300"
			style="top: {getRecordTop(i)}px; z-index: {i}; background-color: {record.theme
				.bg}; border: 2px solid {record.theme.border};"
			onclick={() => (selectedIndex = selectedIndex === i ? null : i)}
		>
			<h1 style="color: {record.theme.titleColor}">{record.title}</h1>
			<p style="color: {record.theme.descColor}">{record.desc}</p>
		</button>
	{/each}

	<div
		class="absolute z-50 h-200 w-200 rounded-b-sm bg-stone-800 text-center text-white transition-all duration-300"
		style="top: {getSleeveTop()}px"
	>
		<h1 class="m-16 text-5xl italic">Remixed</h1>
		<p>
			turn your music taste into a website, create a rhythm game, or ship a music related project!!
			💖
		</p>
	</div>
</div>
