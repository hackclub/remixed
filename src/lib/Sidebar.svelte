<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { styleButton, stylePopover } from './styles';

	const records = [
		{ name: 'Projects', route: '/projects', img: '/dashboard/crunch-projects.png' },
		{ name: 'Gallery', route: '/gallery', img: '/dashboard/crunch-gallery.png' },
		{ name: 'Shop', route: '/shop', img: '/dashboard/crunch-shop.png' },
	];

	let currentPageIndex: number = $state(
		records.findIndex((rec) => page.url.pathname.startsWith(rec.route)),
	);
	let hoveredIndex: number = $state(currentPageIndex);

	function getBgColor(i: number): string {
		return i == currentPageIndex ? 'var(--color-primary)' : 'var(--color-text)';
	}
	function getTextColor(i: number): string {
		return i == currentPageIndex ? 'var(--color-text)' : 'var(--color-primary)';
	}

	function getStyles(i: number): string {
		return `bottom: ${i == hoveredIndex ? 0 : -70}px;
		left: ${i * 100 + (i > hoveredIndex ? 40 : 0)}px;
		`;
	}
</script>

<div class={stylePopover} popover id="confirm-signout">
	<h1 class="mb-4 text-center font-gothic text-2xl text-text">Are you sure?</h1>
	<a
		href="/auth/logout"
		data-sveltekit-preload-data="off"
		class="{styleButton} block w-full bg-primary"
	>
		Log Out
	</a>
</div>

<div class="fixed bottom-0 left-0 z-20 flex">
	{#each records as record, i}
		<a
			style={getStyles(i)}
			href={record.route}
			class="absolute bottom-0 inline h-min w-48 align-bottom transition-all duration-200 hover:bottom-18"
			onmouseenter={() => (hoveredIndex = i)}
			onmouseleave={() => (hoveredIndex = currentPageIndex)}
		>
			<img src={record.img} alt="" class="align-bottom" />
		</a>
	{/each}
</div>
