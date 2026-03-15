<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import { stylePopover } from '$lib/styles.js';
	import { styleButton, styleH1, styleInput } from '$lib/styles';
	let { data } = $props();

	let activeItem = $state(null);
	let actionText = $state('');

	function newItem() {
		actionText = 'Create';
		activeItem = {
			id: -1,
			name: '',
			cost: 0,
			description: '',
			imageUrl: ''
		};
	}
</script>

<Sidebar />

<div class={stylePopover} popover id="manage-item">
	<h1 class="mb-8 text-center font-nikkyou text-3xl">{actionText}</h1>
	{#if activeItem}
		<form action="?/updateItem" method="POST">
			<input type="hidden" name="itemId" bind:value={activeItem.id} />
			<label for="name" class="mt-4 font-nikkyou text-2xl text-text">Name</label>
			<input
				type="text"
				id="name"
				name="name"
				class="{styleInput} w-full font-jua"
				bind:value={activeItem.name}
			/>
			<label for="cost" class="mt-4 font-nikkyou text-2xl text-text">Cost</label>
			<input
				type="number"
				min="0"
				id="cost"
				name="cost"
				class="{styleInput} w-full font-jua"
				bind:value={activeItem.cost}
			/>
			<label for="description" class="mt-4 font-nikkyou text-2xl text-text">Description</label>
			<textarea
				name="description"
				id="description"
				bind:value={activeItem.description}
				class="{styleInput} w-full font-jua"
			></textarea>
			<label for="imageUrl" class="mt-4 font-nikkyou text-2xl text-text">Image URL</label>
			<input
				type="url"
				id="imageUrl"
				name="imageUrl"
				class="{styleInput} w-full font-mono text-xs"
				bind:value={activeItem.imageUrl}
			/>
			<input type="submit" value={actionText} class="{styleButton} mt-4 w-full bg-primary" />
		</form>
	{/if}
</div>

<div class="pt-10 pr-10 pl-40">
	<button
		class="{styleButton} mx-auto mb-8 block bg-primary"
		onclick={newItem}
		popovertarget="manage-item">New</button
	>
	<table class="w-full">
		<thead class="font-gothic text-text">
			<tr>
				<th>ID</th>
				<th>Name</th>
				<th>Cost</th>
				<th>Description</th>
				<th>Image</th>
			</tr>
		</thead>
		<tbody class="font-zcool text-text">
			{#each data.items as item}
				<tr>
					<td>{item.id}</td>
					<td>
						{item.name}
					</td>
					<td>
						{item.cost}
					</td>
					<td class="max-w-80">
						{item.description}
					</td>
					<td>
						<img src={item.imageUrl} alt="shop item" class="h-10 transition-all hover:h-80" />
					</td>
					<td>
						<button
							onclick={() => {
								actionText = 'Update';
								activeItem = item;
							}}
							popovertarget="manage-item"
							class="cursor-pointer bg-primary px-4 font-nikkyou text-text"
						>
							Manage
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	td {
		border: 2px solid currentColor;
		padding: 4px 8px;
	}
	a {
		text-decoration: underline;
	}
</style>
