<script lang="ts">
	import { styleButton, styleInput } from '$lib/styles';
</script>

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
<label for="zipCode" class="mt-4 block font-nikkyou text-2xl text-text">Zip Code</label>
<input
	placeholder="10001"
	type="text"
	name="zipCode"
	id="zipCode"
	autocomplete="shipping postal-code"
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
<input type="submit" class="{styleButton} mt-8 block w-full bg-primary" value="Place Order" />
