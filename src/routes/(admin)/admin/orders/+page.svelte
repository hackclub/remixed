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
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="fulfill-order"
>
	{#if activeItem && activeOrderInfo}
		<div class="border-base-300 flex items-center gap-3 border-b px-5 py-4">
			{#if activeItem.imageUrl}
				<img
					src={activeItem.imageUrl}
					alt={activeItem.name}
					class="h-10 w-10 rounded object-cover"
				/>
			{/if}
			<h3 class="text-sm font-semibold">{activeItem.name}</h3>
		</div>
	{/if}
	<div class="p-5">
		{#if activeItem && activeOrderInfo}
			<div class="mb-4 space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-base-content/60">Country</span>
					<span>{activeOrderInfo.country}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Address</span>
					<span class="cursor-pointer text-right blur-sm transition-all hover:blur-none">
						{activeOrderInfo.addressLine1}
						{#if activeOrderInfo.addressLine2}<br />{activeOrderInfo.addressLine2}{/if}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Zip / City</span>
					<span class="cursor-pointer blur-sm transition-all hover:blur-none">
						{activeOrderInfo.zipCode}, {activeOrderInfo.city}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">State</span>
					<span class="cursor-pointer blur-sm transition-all hover:blur-none"
						>{activeOrderInfo.state}</span
					>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Email</span>
					<span class="cursor-pointer blur-sm transition-all hover:blur-none"
						>{activeOrderInfo.email}</span
					>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Full Name</span>
					<span class="cursor-pointer blur-sm transition-all hover:blur-none"
						>{activeOrderInfo.fullName}</span
					>
				</div>
			</div>
			<p class="text-base-content/40 mb-4 text-xs">Hover over blurred fields to reveal them.</p>
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
				<span class="text-base-content/60 ml-3 text-sm">Loading order details...</span>
			</div>
		{/if}
	</div>
</div>

<div class="space-y-8">
	<h1 class="text-xl font-bold">Order Fulfillment</h1>

	<!-- Pending Orders -->
	<section>
		<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
			Pending Orders ({data.pendingOrders.length})
		</h2>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
			<table class="table-sm table-zebra table">
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
								<div class="flex items-center gap-2">
									<img
										src={orderInfo.user.avatarUrl ?? '/404.jpg'}
										alt={orderInfo.user.username}
										class="h-6 w-6 shrink-0 rounded-full object-cover"
									/>
									<a href="/user/{orderInfo.user.id}" class="link link-hover">
										{orderInfo.user.username}
									</a>
								</div>
							</td>
							<td>
								<div class="flex items-center gap-2">
									{#if orderInfo.item.imageUrl}
										<img
											src={orderInfo.item.imageUrl}
											alt={orderInfo.item.name}
											class="h-8 w-8 shrink-0 rounded object-cover"
										/>
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
							<td colspan="5" class="text-base-content/40 py-6 text-center">No pending orders</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Fulfilled Orders -->
	<section>
		<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
			Fulfilled Orders ({data.fulfilledOrders.length})
		</h2>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border opacity-80">
			<table class="table-sm table-zebra table">
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
								<div class="flex items-center gap-2">
									<img
										src={orderInfo.user.avatarUrl ?? '/404.jpg'}
										alt={orderInfo.user.username}
										class="h-6 w-6 shrink-0 rounded-full object-cover"
									/>
									<a href="/user/{orderInfo.user.id}" class="link link-hover">
										{orderInfo.user.username}
									</a>
								</div>
							</td>
							<td>
								<div class="flex items-center gap-2">
									{#if orderInfo.item.imageUrl}
										<img
											src={orderInfo.item.imageUrl}
											alt={orderInfo.item.name}
											class="h-8 w-8 shrink-0 rounded object-cover opacity-70"
										/>
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
							<td colspan="5" class="text-base-content/40 py-6 text-center">No fulfilled orders</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
