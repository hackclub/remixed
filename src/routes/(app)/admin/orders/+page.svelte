<script lang="ts">
	import type { PageData } from './$types';
	import { styleAdminPopover, styleButton } from '$lib/styles.js';

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

<div bind:this={fulfillOrderPopover} class={styleAdminPopover} popover id="fulfill-order">
	<form action="?/completeOrder" method="POST" class="space-y-4">
		{#if activeItem && activeOrderInfo}
			<input type="hidden" value={activeOrderInfo.id} name="orderId" />
			<p class="font-jua text-2xl">{activeItem.name}</p>
			<ul class="space-y-2 font-jua">
				<li>
					Country: <span class="ml-2 text-xl">{activeOrderInfo.country}</span>
				</li>
				<li>
					Address (Line 1): <span class="ml-2 text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.addressLine1}
					</span>
				</li>
				{#if activeOrderInfo.addressLine2}
					<li>
						Address (Line 2): <span class="ml-2 text-sm blur-sm transition hover:blur-none">
							{activeOrderInfo.addressLine2}
						</span>
					</li>
				{/if}
				<li>
					Zip Code: <span class="ml-2 text-sm blur-sm transition hover:blur-none"
						>{activeOrderInfo.zipCode}</span
					>
				</li>
				<li>
					City: <span class="ml-2 text-sm blur-sm transition hover:blur-none"
						>{activeOrderInfo.city}</span
					>
				</li>
				<li>
					State / Province: <span class="ml-2 text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.state}
					</span>
				</li>
				<li>
					Email: <span class="ml-2 text-sm blur-sm transition hover:blur-none"
						>{activeOrderInfo.email}</span
					>
				</li>
				<li>
					Full Name: <span class="ml-2 text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.fullName}
					</span>
				</li>
			</ul>
			<div class="flex gap-3 pt-4">
				<button
					type="button"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					onclick={() => fulfillOrderPopover?.hidePopover()}>Cancel</button
				>
				<input
					type="submit"
					value="Complete"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				/>
			</div>
		{/if}
	</form>
</div>

<div class="p-10 pb-40 font-jua text-text">
	<div class="space-y-10">
		<div>
			<p class="mb-3 text-2xl">Pending Orders</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Item</th>
						<th>Country</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each data.pendingOrders as orderInfo}
						<tr>
							<td>{orderInfo.order.id}</td>
							<td>
								<a href="/user/{orderInfo.user.id}">
									{orderInfo.user.username}
								</a>
							</td>
							<td>
								<a href="/shop/{orderInfo.item.id}">
									{orderInfo.item.name}
								</a>
							</td>
							<td>{orderInfo.order.country}</td>
							<td>
								<div class="flex flex-wrap gap-2">
									<button
										class="{styleButton} bg-text px-4 py-1 text-lg text-light"
										onclick={() => {
											activeItem = orderInfo.item;
											activeOrderInfo = null;
											fetchOrderInfo(orderInfo.order.id);
										}}
										popovertarget="fulfill-order">Show address</button
									>
									<form action="?/completeOrder" method="POST">
										<input type="hidden" name="orderId" value={orderInfo.order.id} />
										<button
											class="{styleButton} bg-text px-4 py-1 text-lg text-light"
											type="submit"
										>
											Mark as fulfilled
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div>
			<p class="mb-3 text-2xl">Fulfilled Orders</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>ID</th>
						<th>User</th>
						<th>Item</th>
						<th>Country</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each data.fulfilledOrders as orderInfo}
						<tr>
							<td>{orderInfo.order.id}</td>
							<td>
								<a href="/user/{orderInfo.user.id}">
									{orderInfo.user.username}
								</a>
							</td>
							<td>
								<a href="/shop/{orderInfo.item.id}">
									{orderInfo.item.name}
								</a>
							</td>
							<td>{orderInfo.order.country}</td>
							<td>
								<div class="flex flex-wrap gap-2">
									<button
										class="{styleButton} bg-text px-4 py-1 text-lg text-light"
										onclick={() => {
											activeItem = orderInfo.item;
											activeOrderInfo = null;
											fetchOrderInfo(orderInfo.order.id);
										}}
										popovertarget="fulfill-order">Show address</button
									>
									<form action="?/reopenOrder" method="POST">
										<input type="hidden" name="orderId" value={orderInfo.order.id} />
										<button
											class="{styleButton} bg-text px-4 py-1 text-lg text-light"
											type="submit"
										>
											Mark as not fulfilled
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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
	a {
		text-decoration: underline;
	}
</style>
