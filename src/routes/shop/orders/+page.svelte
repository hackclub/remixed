<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import { styleButton, styleH1, styleH2 } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />
<div class="pt-10 pr-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">ORDERS</h1>
	<div class="flex flex-row flex-wrap justify-center gap-4">
		{#each data.orders as orderInfo}
			<div
				class="relative top-0 flex h-32 gap-4 bg-accent-purple p-4 shadow-button transition-all hover:-top-1 hover:shadow-button-hover"
			>
				<img src={orderInfo.item.imageUrl} alt="item" />
				<div class="flex h-full flex-col justify-between">
					<div>
						<h2 class="{styleH2} text-text">{orderInfo.item.name}</h2>
						<p
							class="{orderInfo.order.status == 'PENDING'
								? 'bg-accent-red'
								: 'bg-primary'} mt-2 box-content border-4 border-b-8 border-text text-center font-gothic text-sm text-text"
						>
							{orderInfo.order.status}
						</p>
					</div>
					<p class="text-center font-gothic text-xs text-text">
						Order ID: #{orderInfo.order.id}
					</p>
				</div>
			</div>
		{/each}
	</div>
</div>
