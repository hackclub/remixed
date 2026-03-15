<script lang="ts">
	import { styleH1, styleH2, stylePopover, styleButton } from '$lib/styles.js';
	import Sidebar from '$lib/Sidebar.svelte';

	let { data } = $props();
	let activeItem = $state(null);
	let activeOrderInfo = $state(null);

	function fetchOrderInfo(id: number) {
		fetch(`/api/admin/order_info?id=${id}`)
			.then((resp) => resp.json())
			.then((r) => (activeOrderInfo = r));
	}
</script>

<Sidebar />
<div class={stylePopover} popover id="fulfill-order">
	<h1 class="{styleH1} mb-8 text-text">Fulfill</h1>
	<form action="?/completeOrder" method="POST">
		{#if activeItem && activeOrderInfo}
			<input type="hidden" value={activeOrderInfo.id} name="orderId" />
			<h2 class="{styleH2} ">Item: {activeItem.name}</h2>
			<ul>
				<li class="font-gothic">
					Country: <span class="ml-2 font-jua text-xl">
						{activeOrderInfo.country}
					</span>
				</li>
				<li class="font-gothic">
					Address (Line 1): <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.addressLine1}
					</span>
				</li>
				{#if activeOrderInfo.addressLine2}
					<li class="font-gothic">
						Address (Line 2): <span
							class="ml-2 font-jua text-sm blur-sm transition hover:blur-none"
						>
							{activeOrderInfo.addressLine2}
						</span>
					</li>
				{/if}
				<li class="font-gothic">
					Zip Code: <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.zipCode}
					</span>
				</li>
				<li class="font-gothic">
					City: <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.city}
					</span>
				</li>
				<li class="font-gothic">
					State / Province: <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.state}
					</span>
				</li>
				<li class="font-gothic">
					Email: <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.email}
					</span>
				</li>
				<li class="font-gothic">
					Full Name: <span class="ml-2 font-jua text-sm blur-sm transition hover:blur-none">
						{activeOrderInfo.fullName}
					</span>
				</li>
			</ul>
			<input type="submit" value="Complete" class="{styleButton} mt-4 w-full bg-primary" />
		{/if}
	</form>
</div>

<div class="pt-10 pr-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">ORDERS</h1>
	<table class="w-full">
		<thead class="font-gothic text-text">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Item</th>
				<th>Country</th>
			</tr>
		</thead>
		<tbody class="font-zcool text-text">
			{#each data.orders as orderInfo}
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
						<button
							class="cursor-pointer bg-primary px-4 font-nikkyou text-text"
							onclick={() => {
								activeItem = orderInfo.item;
								activeOrderInfo = null;
								fetchOrderInfo(orderInfo.order.id);
							}}
							popovertarget="fulfill-order">Fulfill</button
						>
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
