<script lang="ts">
	import type { PageData } from './$types';

	type OrderRow = PageData['pendingOrders'][number];
	type OrderItem = OrderRow['item'];
	type OrderDetails = {
		id: number;
		country: string;
		addressLine1: string;
		addressLine2: string | null;
		zipCode: string;
		city: string;
		state: string;
		email: string;
		fullName: string;
	};

	let { data }: { data: PageData } = $props();
	let activeItem = $state<OrderItem | null>(null);
	let activeOrderInfo = $state<OrderDetails | null>(null);
	let fulfillOrderPopover: HTMLElement | undefined = $state();

	function fetchOrderInfo(id: number) {
		fetch(`/api/admin/order_info?id=${id}`)
			.then((resp) => resp.json() as Promise<OrderDetails>)
			.then((r) => (activeOrderInfo = r));
	}
</script>

<svelte:head><title>Order Fulfillment — Admin</title></svelte:head>

<!-- Fulfill order popover -->
<div
	bind:this={fulfillOrderPopover}
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(90vw,36rem)]"
	popover
	id="fulfill-order"
>
	{#if activeItem && activeOrderInfo}
		<div class="px-5 py-4 border-b border-base-300 flex items-center gap-3">
			{#if activeItem.imageUrl}
				<img src={activeItem.imageUrl} alt={activeItem.name} class="w-10 h-10 rounded object-cover" />
			{/if}
			<h3 class="font-semibold text-sm">{activeItem.name}</h3>
		</div>
	{/if}
	<div class="p-5">
		{#if activeItem && activeOrderInfo}
			<div class="space-y-2 text-sm mb-4">
				<div class="flex justify-between">
					<span class="text-base-content/60">Country</span>
					<span>{activeOrderInfo.country}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Address</span>
					<span class="blur-sm hover:blur-none transition-all cursor-pointer text-right">
						{activeOrderInfo.addressLine1}
						{#if activeOrderInfo.addressLine2}<br />{activeOrderInfo.addressLine2}{/if}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Zip / City</span>
					<span class="blur-sm hover:blur-none transition-all cursor-pointer">
						{activeOrderInfo.zipCode}, {activeOrderInfo.city}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">State</span>
					<span class="blur-sm hover:blur-none transition-all cursor-pointer">{activeOrderInfo.state}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Email</span>
					<span class="blur-sm hover:blur-none transition-all cursor-pointer">{activeOrderInfo.email}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Full Name</span>
					<span class="blur-sm hover:blur-none transition-all cursor-pointer">{activeOrderInfo.fullName}</span>
				</div>
			</div>
			<p class="text-xs text-base-content/40 mb-4">Hover over blurred fields to reveal them.</p>
			<form action="?/completeOrder" method="POST">
				<input type="hidden" value={activeOrderInfo.id} name="orderId" />
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => fulfillOrderPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" value="Mark as Fulfilled" class="btn btn-sm btn-success flex-1" />
				</div>
			</form>
		{:else}
			<div class="flex items-center justify-center py-8">
				<span class="loading loading-spinner loading-md"></span>
				<span class="ml-3 text-sm text-base-content/60">Loading order details...</span>
			</div>
		{/if}
	</div>
</div>

<div class="space-y-8">
	<h1 class="text-xl font-bold">Order Fulfillment</h1>

	<!-- Pending Orders -->
	<section>
		<h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-2">
			Pending Orders ({data.pendingOrders.length})
		</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
			<table class="table table-sm table-zebra">
				<thead>
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Item</th>
						<th>Country</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.pendingOrders as orderInfo}
						<tr>
							<td class="font-mono text-xs">{orderInfo.order.id}</td>
							<td>
								<a href="/user/{orderInfo.user.id}" class="link link-hover">
									{orderInfo.user.username}
								</a>
							</td>
							<td>
								<div class="flex items-center gap-2">
									{#if orderInfo.item.imageUrl}
										<img src={orderInfo.item.imageUrl} alt={orderInfo.item.name} class="w-8 h-8 rounded object-cover shrink-0" />
									{/if}
									<a href="/shop/{orderInfo.item.id}" class="link link-hover">
										{orderInfo.item.name}
									</a>
								</div>
							</td>
							<td>{orderInfo.order.country}</td>
							<td>
								<div class="flex gap-1">
									<button
										class="btn btn-xs btn-outline"
										onclick={() => {
											activeItem = orderInfo.item;
											activeOrderInfo = null;
											fetchOrderInfo(orderInfo.order.id);
										}}
										popovertarget="fulfill-order">Show address</button
									>
									<form action="?/completeOrder" method="POST">
										<input type="hidden" name="orderId" value={orderInfo.order.id} />
										<button class="btn btn-xs btn-success" type="submit">Fulfill</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.pendingOrders.length === 0}
						<tr>
							<td colspan="5" class="text-center text-base-content/40 py-6">No pending orders</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Fulfilled Orders -->
	<section>
		<h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-2">
			Fulfilled Orders ({data.fulfilledOrders.length})
		</h2>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 opacity-80">
			<table class="table table-sm table-zebra">
				<thead>
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Item</th>
						<th>Country</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.fulfilledOrders as orderInfo}
						<tr>
							<td class="font-mono text-xs">{orderInfo.order.id}</td>
							<td>
								<a href="/user/{orderInfo.user.id}" class="link link-hover">
									{orderInfo.user.username}
								</a>
							</td>
							<td>
								<div class="flex items-center gap-2">
									{#if orderInfo.item.imageUrl}
										<img src={orderInfo.item.imageUrl} alt={orderInfo.item.name} class="w-8 h-8 rounded object-cover shrink-0 opacity-70" />
									{/if}
									<a href="/shop/{orderInfo.item.id}" class="link link-hover">
										{orderInfo.item.name}
									</a>
								</div>
							</td>
							<td>{orderInfo.order.country}</td>
							<td>
								<div class="flex gap-1">
									<button
										class="btn btn-xs btn-outline"
										onclick={() => {
											activeItem = orderInfo.item;
											activeOrderInfo = null;
											fetchOrderInfo(orderInfo.order.id);
										}}
										popovertarget="fulfill-order">Show address</button
									>
									<form action="?/reopenOrder" method="POST">
										<input type="hidden" name="orderId" value={orderInfo.order.id} />
										<button class="btn btn-xs btn-outline" type="submit">Unfulfill</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
					{#if data.fulfilledOrders.length === 0}
						<tr>
							<td colspan="5" class="text-center text-base-content/40 py-6">No fulfilled orders</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
