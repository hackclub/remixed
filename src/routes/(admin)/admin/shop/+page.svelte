<script lang="ts">
	import type { ActionData, PageData } from './$types';

	type EditableItem = {
		id: number;
		name: string;
		cost: number;
		description: string;
		imageUrl: string;
		categories: string[];
	};

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let activeItem = $state<EditableItem | null>(null);
	let actionText = $state('');
	let manageItemPopover: HTMLElement | undefined = $state();
	let deleteItemPopover: HTMLElement | undefined = $state();

	function newItem() {
		actionText = 'Create';
		activeItem = { id: -1, name: '', cost: 0, description: '', imageUrl: '', categories: [] };
	}

	function editItem(item: PageData['items'][number]) {
		actionText = 'Update';
		activeItem = {
			id: item.id,
			name: item.name,
			cost: item.cost,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
			categories: item.categories ?? [],
		};
	}

	function deleteItem(item: PageData['items'][number]) {
		activeItem = {
			id: item.id,
			name: item.name,
			cost: item.cost,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
			categories: item.categories ?? [],
		};
		requestAnimationFrame(() => deleteItemPopover?.showPopover());
	}

	function formatDeletedAt(value: Date | string) {
		return new Date(value).toLocaleString();
	}
</script>

<svelte:head><title>Shop Catalog — Admin</title></svelte:head>

<!-- Manage item popover -->
<div
	bind:this={manageItemPopover}
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(90vw,36rem)]"
	popover
	id="manage-item"
>
	{#if activeItem}
		<div class="px-5 py-4 border-b border-base-300">
			<h3 class="font-semibold text-sm">{actionText} Item</h3>
		</div>
		<div class="p-5">
			<form action="?/updateItem" method="POST" class="space-y-3">
				<input type="hidden" name="itemId" bind:value={activeItem.id} />
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Name</legend>
					<input
						type="text"
						name="name"
						class="input input-bordered input-sm w-full"
						bind:value={activeItem.name}
						required
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Cost (notes)</legend>
					<input
						type="number"
						min="0"
						name="cost"
						class="input input-bordered input-sm w-full"
						bind:value={activeItem.cost}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Description</legend>
					<textarea
						name="description"
						bind:value={activeItem.description}
						class="textarea textarea-bordered textarea-sm w-full"
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Categories (comma-separated)</legend>
					<input
						type="text"
						name="categories"
						class="input input-bordered input-sm w-full"
						placeholder="e.g. Risk of Rain, Peak, Plushie"
						bind:value={activeItem.categories}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Image URL</legend>
					<input
						type="url"
						name="imageUrl"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeItem.imageUrl}
					/>
				</fieldset>
				<div class="flex gap-2 pt-1">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => manageItemPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" value={actionText} class="btn btn-sm btn-primary flex-1" />
				</div>
			</form>
		</div>
	{/if}
</div>

<!-- Delete item popover -->
<div
	bind:this={deleteItemPopover}
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(90vw,36rem)]"
	popover
	id="delete-item"
>
	{#if activeItem}
		<div class="px-5 py-4 border-b border-base-300">
			<h3 class="font-semibold text-sm">Delete {activeItem.name}?</h3>
		</div>
		<div class="p-5">
			<p class="text-sm text-base-content/60 mb-4">
				This archives the item and removes it from the live shop catalog. Items with existing orders
				still cannot be deleted.
			</p>
			<form action="?/deleteItem" method="POST">
				<input type="hidden" name="itemId" value={activeItem.id} />
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => deleteItemPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" value="Delete" class="btn btn-sm btn-error flex-1" />
				</div>
			</form>
		</div>
	{/if}
</div>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">Shop Catalog</h1>
		<button class="btn btn-sm btn-primary" onclick={newItem} popovertarget="manage-item">
			New Item
		</button>
	</div>

	{#if form?.error}
		<div class="alert alert-error text-sm">{form.error}</div>
	{/if}

	<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
		<table class="table table-sm table-zebra">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Cost</th>
					<th>Description</th>
					<th>Categories</th>
					<th>Image</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item}
					<tr>
						<td class="font-mono text-xs">{item.id}</td>
						<td>{item.name}</td>
						<td>{item.cost}</td>
						<td class="max-w-xs">
							<div class="truncate text-xs text-base-content/70">{item.description}</div>
						</td>
						<td>
							<div class="flex flex-wrap gap-1">
								{#each item.categories ?? [] as cat}
									<span class="badge badge-outline badge-xs">{cat}</span>
								{/each}
							</div>
						</td>
						<td>
							{#if item.imageUrl}
								<img src={item.imageUrl} alt="shop item" class="w-20 h-14 object-cover rounded" />
							{:else}
								<span class="text-base-content/30">—</span>
							{/if}
						</td>
						<td>
							<div class="flex gap-1">
								<button
									onclick={() => editItem(item)}
									popovertarget="manage-item"
									class="btn btn-xs btn-outline">Manage</button
								>
								<button
									type="button"
									onclick={() => deleteItem(item)}
									class="btn btn-xs btn-error btn-outline">Delete</button
								>
							</div>
						</td>
					</tr>
				{/each}
				{#if data.items.length === 0}
					<tr><td colspan="7" class="text-center text-base-content/40 py-6">No items</td></tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Deleted Items -->
	<section>
		<h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-1">
			Deleted Items
		</h2>
		<p class="text-xs text-base-content/50 mb-3">Archived rows kept after removal from the catalog.</p>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 opacity-75">
			<table class="table table-sm table-zebra">
				<thead>
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
				<tbody>
					{#each data.deletedItems as deletedItem}
						<tr>
							<td class="font-mono text-xs">{deletedItem.item.originalId}</td>
							<td>{deletedItem.item.name}</td>
							<td>{deletedItem.item.cost}</td>
							<td class="max-w-xs">
								<div class="truncate text-xs text-base-content/70">{deletedItem.item.description}</div>
							</td>
							<td>
								{#if deletedItem.item.imageUrl}
									<img
										src={deletedItem.item.imageUrl}
										alt="deleted shop item"
										class="w-20 h-14 object-cover rounded opacity-60"
									/>
								{:else}
									<span class="text-base-content/30">—</span>
								{/if}
							</td>
							<td class="text-xs">{formatDeletedAt(deletedItem.item.deletedAt)}</td>
							<td>{deletedItem.deletedByUsername}</td>
						</tr>
					{/each}
					{#if data.deletedItems.length === 0}
						<tr><td colspan="7" class="text-center text-base-content/40 py-6">No deleted items</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
