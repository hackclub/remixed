<script lang="ts">
	import './admin-styles.css';

	let { children } = $props();
</script>

<div data-theme="dim">
	{@render children()}
</div>
