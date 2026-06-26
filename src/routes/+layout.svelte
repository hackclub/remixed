<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import PageHeader from '$lib/PageHeader.svelte';
	import ProfileCard from '$lib/ProfileCard.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import './layout.css';
	let { children, data } = $props();
	const TITLE_SUFFIX = ' - Remixed';

	let showBanner = $state(true);

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

{#if showBanner}
<div class="banner">
    <h1>This Hack Club event has ended! You can see current programs at <a style="color: #5bc0de; text-decoration: none;" href="https://ysws.hackclub.com"> ysws.hackclub.com </a></h1>
    <button class="close-btn" on:click={() => showBanner = false}>×</button>
</div>
{/if}

{@render children()}

<style>
.banner {
    background-color: #ec3750;
    color: rgb(255, 255, 255);
    padding: 20px;
    text-align: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1000;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
}
.banner h1 {
    font-size: 15px;
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.close-btn {
    position: absolute;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #8492a6;
    font-size: 28px;
    cursor: pointer;
}
.close-btn:hover {
    opacity: 0.7;
}
</style>
