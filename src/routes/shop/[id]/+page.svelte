<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import Note from '$lib/Note.svelte';
	import { stylePopover, styleButton, styleH1, styleH2, styleInput } from '$lib/styles';

	let { data } = $props();
</script>

<Sidebar />

<div class="{stylePopover} max-h-9/10" id="continue" popover>
	<h1 class="mb-8 text-center font-nikkyou text-3xl">Confirm</h1>
	<form action="?/placeOrder" method="POST">
		<label for="addressLine1" class="block font-nikkyou text-2xl text-text">Street Address</label>
		<input
			placeholder="1234 Main St (Line 1)"
			type="text"
			name="addressLine1"
			id="addressLine1"
			autocomplete="shipping street-address webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<input
			placeholder="Apt 4B (Line 2, optional)"
			type="text"
			name="addressLine2"
			id="addressLine2"
			autocomplete="shipping address-level4 webauthn"
			class="{styleInput} mt-1 w-full font-jua"
		/>
		<label for="zipcode" class="mt-4 block font-nikkyou text-2xl text-text">Zip Code</label>
		<input
			placeholder="10001"
			type="text"
			name="zipcode"
			id="zipcode"
			autocomplete="shipping zip-code"
			required
			class="{styleInput} w-full font-jua"
		/>
		<label for="city" class="mt-4 block font-nikkyou text-2xl text-text">City</label>
		<input
			placeholder="Paris"
			type="text"
			name="city"
			id="city"
			autocomplete="shipping address-level2 webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<label for="state" class="mt-4 block font-nikkyou text-2xl text-text">State / Province</label>
		<input
			placeholder="Washington"
			type="text"
			name="state"
			id="state"
			autocomplete="shipping address-level1 webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<label for="country" class="mt-4 block font-nikkyou text-2xl text-text">Country / Region</label>
		<input
			placeholder="Canada"
			type="text"
			name="country"
			id="country"
			autocomplete="shipping country-name webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<label for="email" class="mt-4 block font-nikkyou text-2xl text-text">Email</label>
		<input
			placeholder="me@hack.club"
			type="text"
			name="email"
			id="email"
			autocomplete="shipping email webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<label for="fullName" class="mt-4 block font-nikkyou text-2xl text-text">Full Name</label>
		<input
			placeholder="Orpheus Club"
			type="text"
			name="fullName"
			id="fullName"
			autocomplete="shipping name webauthn"
			required
			class="{styleInput} w-full font-jua"
		/>
		<input type="submit" class="{styleButton} mt-4 w-full bg-primary" value="Place Order" />
	</form>
</div>

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
				{#if data.item.cost <= data.balance}
					<button class="{styleButton} w-full bg-primary" popovertarget="continue"
						>Continue ({data.item.cost}<Note />)</button
					>
				{:else}
					<button class="{styleButton} w-full bg-accent-red"
						>Too Expensive! ({data.item.cost}<Note />)</button
					>
				{/if}
			</div>
		</div>
	</div>
</div>
