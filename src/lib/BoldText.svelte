<script lang="ts">
	let { children, stroke = '1', class: className = '' } = $props();
</script>

<span class="{className} relative inline-flex w-max justify-center">
	<span class="text-stroke text-stroke-{stroke} bg-light">{@render children()}</span>
	<span class="text-dark-gradient absolute top-0 p-1">{@render children()}</span>
</span>
