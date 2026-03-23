<script lang="ts">
	import { styleButton, styleCardInput } from '$lib/styles';
</script>

<label for="addressLine1" class="block font-jua text-xl text-light">Street Address</label>
<input
	placeholder="1234 Main St (Line 1)"
	type="text"
	name="addressLine1"
	id="addressLine1"
	autocomplete="shipping street-address webauthn"
	required
	class={styleCardInput}
/>
<input
	placeholder="Apt 4B (Line 2, optional)"
	type="text"
	name="addressLine2"
	id="addressLine2"
	autocomplete="shipping address-level4 webauthn"
	class="{styleCardInput} mt-1"
/>
<label for="zipCode" class="mt-4 block font-jua text-xl text-light">Zip Code</label>
<input
	placeholder="10001"
	type="text"
	name="zipCode"
	id="zipCode"
	autocomplete="shipping postal-code"
	required
	class={styleCardInput}
/>
<label for="city" class="mt-4 block font-jua text-xl text-light">City</label>
<input
	placeholder="Paris"
	type="text"
	name="city"
	id="city"
	autocomplete="shipping address-level2 webauthn"
	required
	class={styleCardInput}
/>
<label for="state" class="mt-4 block font-jua text-xl text-light">State / Province</label>
<input
	placeholder="Washington"
	type="text"
	name="state"
	id="state"
	autocomplete="shipping address-level1 webauthn"
	required
	class={styleCardInput}
/>
<label for="country" class="mt-4 block font-jua text-xl text-light">Country / Region</label>
<input
	placeholder="Canada"
	type="text"
	name="country"
	id="country"
	autocomplete="shipping country-name webauthn"
	required
	class={styleCardInput}
/>
<label for="email" class="mt-4 block font-jua text-xl text-light">Email</label>
<input
	placeholder="me@hack.club"
	type="text"
	name="email"
	id="email"
	autocomplete="shipping email webauthn"
	required
	class={styleCardInput}
/>
<label for="fullName" class="mt-4 block font-jua text-xl text-light">Full Name</label>
<input
	placeholder="Orpheus Club"
	type="text"
	name="fullName"
	id="fullName"
	autocomplete="shipping name webauthn"
	required
	class={styleCardInput}
/>
<input type="submit" class="{styleButton} mt-8 block w-full bg-primary text-text" value="Place Order" />
