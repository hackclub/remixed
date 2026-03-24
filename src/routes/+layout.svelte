<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import PageHeader from '$lib/PageHeader.svelte';
	import ProfileCard from '$lib/ProfileCard.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import './layout.css';

	let { children, data } = $props();

	const TITLE_SUFFIX = ' - Remixed';

	function applyTitleSuffix() {
		if (!document.title || document.title.endsWith(TITLE_SUFFIX)) return;
		document.title = `${document.title}${TITLE_SUFFIX}`;
	}

	onMount(() => {
		applyTitleSuffix();

		const titleElement = document.head.querySelector('title');
		if (!titleElement) return;

		const observer = new MutationObserver(() => {
			applyTitleSuffix();
		});

		observer.observe(titleElement, { childList: true, characterData: true, subtree: true });
		return () => observer.disconnect();
	});

	afterNavigate(() => {
		applyTitleSuffix();
	});
</script>

<svelte:head><link rel="icon" href="/favicon.ico" /></svelte:head>
{@render children()}
