<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import Note from '$lib/Note.svelte';
	import { stylePopover, styleButton, styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />

<div class="{stylePopover} " id="continue" popover></div>

<div class="h-screen pr-10 pl-40">
	<div class="flex h-full w-full flex-col justify-center">
		<h1 class="{styleH1} mb-4 text-text">PURCHASE</h1>
		<h2 class="{styleH2} mb-4 text-text">BALANCE: {data.balance}<Note /></h2>
		<div class="grid grid-cols-2 gap-2 rounded-lg bg-accent-purple shadow-md">
			<div class="m-4 rounded-lg bg-text p-8">
				<img src={data.item.imageUrl} alt="item" />
			</div>
			<div class="flex flex-col justify-between p-4">
				<div>
					<h2 class="{styleH2} mb-4 text-text">{data.item.name}</h2>
					<p class="text-center font-zcool text-text">{data.item.description}</p>
				</div>
				<button class="{styleButton} w-full bg-primary" popovertarget="continue">Continue</button>
			</div>
		</div>
	</div>
</div>
