<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const records = [
		{ name: 'Dashboard', route: '/dashboard' },
		{ name: 'Projects', route: '/projects' },
		{ name: 'Discover', route: '/discover' },
		{ name: 'Shop', route: '/shop' }
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
</script>

<div class="fixed h-screen py-32">
	{#each records as record, i}
		<a
			style="top: {getRecordTop(i)}px;
				z-index: {i};
				background-color: {getBgColor(i)};
				color: {getTextColor(i)};
				left: {i == hoveredIndex ? 0 : -64}px;
				rotate: {i == hoveredIndex ? 45 : -90}deg;
				"
			href={record.route}
			class="absolute flex h-30 w-30 -rotate-90 rounded-full border-2 border-secondary bg-red-500 transition-all duration-200 hover:rotate-45"
			onmouseenter={() => (hoveredIndex = i)}
			onmouseleave={() => (hoveredIndex = currentPageIndex)}
		>
			<h1 class="mt-4 w-full text-center font-gothic">{record.name}</h1>
		</a>
	{/each}
</div>
