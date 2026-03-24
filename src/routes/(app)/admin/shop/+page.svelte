<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { styleAdminPopover } from '$lib/styles.js';
	import { styleButton, styleInput } from '$lib/styles';

	type EditableItem = {
		id: number;
		name: string;
		cost: number;
		description: string;
		imageUrl: string;
	};

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let activeItem = $state<EditableItem | null>(null);
	let actionText = $state('');
	let manageItemPopover: HTMLElement | undefined = $state();
	let deleteItemPopover: HTMLElement | undefined = $state();

	function newItem() {
		actionText = 'Create';
		activeItem = {
			id: -1,
			name: '',
			cost: 0,
			description: '',
			imageUrl: '',
		};
	}

	function editItem(item: PageData['items'][number]) {
		actionText = 'Update';
		activeItem = {
			id: item.id,
			name: item.name,
			cost: item.cost,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
		};
	}

	function deleteItem(item: PageData['items'][number]) {
		activeItem = {
			id: item.id,
			name: item.name,
			cost: item.cost,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
		};
		requestAnimationFrame(() => deleteItemPopover?.showPopover());
	}

	function formatDeletedAt(value: Date | string) {
		return new Date(value).toLocaleString();
	}
</script>

<div bind:this={manageItemPopover} class={styleAdminPopover} popover id="manage-item">
	{#if activeItem}
		<form action="?/updateItem" method="POST" class="space-y-4">
			<input type="hidden" name="itemId" bind:value={activeItem.id} />
			<label for="name" class="block font-jua text-2xl text-light">Name</label>
			<input
				type="text"
				id="name"
				name="name"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeItem.name}
				required
			/>
			<label for="cost" class="block font-jua text-2xl text-light">Cost</label>
			<input
				type="number"
				min="0"
				id="cost"
				name="cost"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeItem.cost}
			/>
			<label for="description" class="block font-jua text-2xl text-light">Description</label>
			<textarea
				name="description"
				id="description"
				bind:value={activeItem.description}
				class="{styleInput} w-full font-jua text-text"
			></textarea>
			<label for="imageUrl" class="block font-jua text-2xl text-light">Image URL</label>
			<input
				type="url"
				id="imageUrl"
				name="imageUrl"
				class="{styleInput} w-full font-mono text-xs text-text"
				bind:value={activeItem.imageUrl}
			/>
			<div class="flex gap-3 pt-4">
				<button
					type="button"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					onclick={() => manageItemPopover?.hidePopover()}>Cancel</button
				>
				<input
					type="submit"
					value={actionText}
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				/>
			</div>
		</form>
	{/if}
</div>

<div bind:this={deleteItemPopover} class={styleAdminPopover} popover id="delete-item">
	{#if activeItem}
		<form action="?/deleteItem" method="POST" class="space-y-4">
			<input type="hidden" name="itemId" value={activeItem.id} />
			<p class="font-jua text-3xl text-light">Delete {activeItem.name}?</p>
			<p class="font-jua text-lg text-light/80">
				This archives the item and removes it from the live shop catalog. Items with existing orders
				still cannot be deleted.
			</p>
			<div class="flex gap-3 pt-4">
				<button
					type="button"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					onclick={() => deleteItemPopover?.hidePopover()}>Cancel</button
				>
				<input
					type="submit"
					value="Delete"
					class="{styleButton} min-w-0 flex-1 bg-accent-red px-4 py-2 text-lg text-light"
				/>
			</div>
		</form>
	{/if}
</div>

<div class="p-10 pb-40 font-jua text-text">
	{#if form?.error}
		<div
			class="mb-6 rounded-2xl border-2 border-accent-red bg-light px-6 py-4 text-xl text-accent-red"
		>
			{form.error}
		</div>
	{/if}
	<div class="mb-8 flex justify-end">
		<button class="{styleButton} bg-text text-light" onclick={newItem} popovertarget="manage-item"
			>New</button
		>
	</div>
	<table class="admin-table w-full bg-accent-purple">
		<thead class="font-jua text-text">
			<tr>
				<th>ID</th>
				<th>Name</th>
				<th>Cost</th>
				<th>Description</th>
				<th>Image</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody class="font-jua text-text">
			{#each data.items as item}
				<tr>
					<td>{item.id}</td>
					<td>
						{item.name}
					</td>
					<td>
						{item.cost}
					</td>
					<td class="h-20">
						{item.description}
					</td>
					<td>
						<img src={item.imageUrl} alt="shop item" class="w-30" />
					</td>
					<td>
						<div class="flex gap-2">
							<button
								onclick={() => editItem(item)}
								popovertarget="manage-item"
								class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							>
								Manage
							</button>
							<button
								type="button"
								onclick={() => deleteItem(item)}
								popovertarget="delete-item"
								class="{styleButton} bg-accent-red px-4 py-1 text-lg text-light"
							>
								Delete
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="mt-10">
		<div class="mb-3">
			<p class="text-2xl">Deleted Items</p>
			<p class="text-lg text-text/70">
				Archived rows are kept here after removal from the catalog.
			</p>
		</div>
		<table class="admin-table w-full bg-accent-purple/70">
			<thead class="font-jua text-text">
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Cost</th>
					<th>Description</th>
					<th>Image</th>
					<th>Deleted</th>
					<th>Deleted By</th>
				</tr>
			</thead>
			<tbody class="font-jua text-text">
				{#each data.deletedItems as deletedItem}
					<tr class="opacity-80">
						<td>{deletedItem.item.originalId}</td>
						<td>{deletedItem.item.name}</td>
						<td>{deletedItem.item.cost}</td>
						<td class="h-20">{deletedItem.item.description}</td>
						<td>
							{#if deletedItem.item.imageUrl}
								<img src={deletedItem.item.imageUrl} alt="deleted shop item" class="w-30" />
							{:else}
								<span class="text-text/60">None</span>
							{/if}
						</td>
						<td>{formatDeletedAt(deletedItem.item.deletedAt)}</td>
						<td>{deletedItem.deletedByUsername}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.admin-table {
		border: 2px solid var(--color-text);
		border-collapse: separate;
		border-radius: 1rem;
		border-spacing: 0;
		overflow: hidden;
	}
	th,
	td {
		border-right: 1px solid var(--color-text);
		border-bottom: 1px solid var(--color-text);
		padding: 4px 8px;
	}
	th:last-child,
	td:last-child {
		border-right: none;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
</style>
