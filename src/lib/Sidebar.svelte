<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const records = [
		{ name: 'Dashboard', route: '/dashboard' },
		{ name: 'Projects', route: '/projects' },
		{ name: 'Discover', route: '/discover' },
		{ name: 'Shop', route: '/shop' },
		{ name: 'Profile', route: '/user' },
		{ name: 'Log Out', route: 'LOGOUT' }
	];

	let currentPageIndex: number = $state(
		records.findIndex((rec) => page.url.pathname.startsWith(rec.route))
	);
	let hoveredIndex: number = $state(currentPageIndex);

	function getRecordTop(i: number): number {
		return 100 + i * 80;
	}

	function getBgColor(i: number): string {
		return i == currentPageIndex ? 'var(--color-secondary)' : 'var(--color-primary)';
	}
	function getTextColor(i: number): string {
		return i == currentPageIndex ? 'var(--color-primary)' : 'var(--color-secondary)';
	}

	function getStyles(i: number): string {
		return `top: ${getRecordTop(i)}px;
			z-index: ${i};
			background-color: ${getBgColor(i)};
			color: ${getTextColor(i)};
			left: ${i == hoveredIndex ? 0 : -64}px;
			rotate: ${i == hoveredIndex ? 45 : -90}deg;
		`;
	}
</script>

<div
	class="fixed top-1/2 left-1/2 w-90 -translate-1/2 rounded-md bg-accent p-8 text-text shadow-md"
	popover
	id="confirm-signout"
>
	<a
		href="/auth/logout"
		data-sveltekit-preload-data="off"
		class="block w-full cursor-pointer rounded-md bg-primary px-4 py-4 text-center font-gothic text-xl text-white"
	>
		Log Out
	</a>
</div>

<div class="fixed h-screen py-32">
	{#each records as record, i}
		{#if record.route == 'LOGOUT'}
			<button
				popovertarget="confirm-signout"
				style={getStyles(i)}
				class="absolute flex size-36 -rotate-90 cursor-pointer rounded-full border-2 border-secondary bg-red-500 transition-all duration-200 hover:rotate-45"
				onmouseenter={() => (hoveredIndex = i)}
				onmouseleave={() => (hoveredIndex = currentPageIndex)}
			>
				<h1 class="mt-6 w-full text-center font-gothic">{record.name}</h1>
			</button>
		{:else}
			<a
				style={getStyles(i)}
				href={record.route}
				class="absolute flex size-36 -rotate-90 rounded-full border-2 border-secondary bg-red-500 transition-all duration-200 hover:rotate-45"
				onmouseenter={() => (hoveredIndex = i)}
				onmouseleave={() => (hoveredIndex = currentPageIndex)}
			>
				<h1 class="mt-6 w-full text-center font-gothic">{record.name}</h1>
			</a>
		{/if}
	{/each}
</div>
