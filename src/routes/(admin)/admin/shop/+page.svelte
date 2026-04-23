<script lang="ts">
	import type { ActionData, PageData } from './$types';

	const REGIONS = ['US', 'EU', 'UK', 'INDIA', 'CANADA', 'AUSTRALIA', 'REST_OF_WORLD'] as const;

	type EditableItem = {
		id: number;
		name: string;
		regionPrices: Record<string, number>;
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
		activeItem = {
			id: -1,
			name: '',
			regionPrices: {},
			description: '',
			imageUrl: '',
			categories: [],
		};
	}

	function editItem(item: PageData['items'][number]) {
		actionText = 'Update';
		activeItem = {
			id: item.id,
			name: item.name,
			regionPrices: item.regionPrices,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
			categories: item.categories ?? [],
		};
	}

	function deleteItem(item: PageData['items'][number]) {
		activeItem = {
			id: item.id,
			name: item.name,
			regionPrices: item.regionPrices,
			description: item.description ?? '',
			imageUrl: item.imageUrl ?? '',
			categories: item.categories ?? [],
		};
		requestAnimationFrame(() => deleteItemPopover?.showPopover());
	}

	function formatDeletedAt(value: Date | string) {
		return new Date(value).toLocaleString();
	}

	function getPriceForRegion(prices: Record<string, number>, region: string): number | undefined {
		return prices[region];
	}

	function getAvailableRegions(prices: Record<string, number>): string[] {
		return REGIONS.filter((r) => r in prices);
	}

	function formatPriceList(prices: Record<string, number>): string {
		const available = getAvailableRegions(prices);
		if (available.length === 0) return 'No pricing';
		return available.map((r) => `${r}: ${prices[r]}`).join(', ');
	}
</script>

<svelte:head><title>Shop Catalog — Admin</title></svelte:head>

<!-- Manage item popover -->
<div
	bind:this={manageItemPopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="manage-item"
>
	{#if activeItem}
		<div class="border-base-300 border-b px-5 py-4">
			<h3 class="text-sm font-semibold">{actionText} Item</h3>
		</div>
		<div class="p-5">
			<form action="?/updateItem" method="POST" class="space-y-3">
				<input type="hidden" name="itemId" bind:value={activeItem.id} />
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Name</legend>
					<input
						type="text"
						name="name"
						class="input input-bordered input-sm w-full"
						bind:value={activeItem.name}
						required
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Regional Pricing (notes)</legend>
					<div class="space-y-2">
						{#each REGIONS as region}
							<div class="flex items-center gap-2">
								<label class="w-20 flex-shrink-0 text-xs">{region}</label>
								<input
									type="number"
									min="0"
									name="region_{region}"
									class="input input-bordered input-sm flex-1"
									placeholder="Optional"
									value={getPriceForRegion(activeItem.regionPrices, region) ?? ''}
									onchange={(e) => {
										const val = (e.target as HTMLInputElement).value;
										if (val) {
											activeItem.regionPrices[region] = Number(val);
										} else {
											delete activeItem.regionPrices[region];
										}
									}}
								/>
							</div>
						{/each}
					</div>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Description</legend>
					<textarea
						name="description"
						bind:value={activeItem.description}
						class="textarea textarea-bordered textarea-sm w-full"
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Categories (comma-separated)</legend>
					<input
						type="text"
						name="categories"
						class="input input-bordered input-sm w-full"
						placeholder="e.g. Risk of Rain, Peak, Plushie"
						bind:value={activeItem.categories}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Image URL</legend>
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
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="delete-item"
>
	{#if activeItem}
		<div class="border-base-300 border-b px-5 py-4">
			<h3 class="text-sm font-semibold">Delete {activeItem.name}?</h3>
		</div>
		<div class="p-5">
			<p class="text-base-content/60 mb-4 text-sm">
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

	<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
		<table class="table-sm table-zebra table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Name</th>
					<th>Regional Pricing</th>
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
						<td class="text-xs">
							<div class="max-w-xs">
								{formatPriceList(item.regionPrices)}
							</div>
						</td>
						<td class="max-w-xs">
							<div class="text-base-content/70 truncate text-xs">{item.description}</div>
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
								<img src={item.imageUrl} alt="shop item" class="h-14 w-20 rounded object-cover" />
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
					<tr><td colspan="7" class="text-base-content/40 py-6 text-center">No items</td></tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Deleted Items -->
	<section>
		<h2 class="text-base-content/70 mb-1 text-sm font-semibold tracking-wide uppercase">
			Deleted Items
		</h2>
		<p class="text-base-content/50 mb-3 text-xs">
			Archived rows kept after removal from the catalog.
		</p>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border opacity-75">
			<table class="table-sm table-zebra table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Regional Pricing</th>
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
							<td class="text-xs">
								<div class="max-w-xs">
									{formatPriceList(deletedItem.item.regionPrices)}
								</div>
							</td>
							<td class="max-w-xs">
								<div class="text-base-content/70 truncate text-xs">
									{deletedItem.item.description}
								</div>
							</td>
							<td>
								{#if deletedItem.item.imageUrl}
									<img
										src={deletedItem.item.imageUrl}
										alt="deleted shop item"
										class="h-14 w-20 rounded object-cover opacity-60"
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
						<tr
							><td colspan="7" class="text-base-content/40 py-6 text-center">No deleted items</td
							></tr
						>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
