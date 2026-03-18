<script lang="ts">
	import BoldText from './BoldText.svelte';

	let { children, title } = $props();
</script>

<div class="max-w-md rounded-2xl border-4 border-light bg-[#435D96] p-8">
	<BoldText stroke="2" class="font-jua text-3xl">{title}</BoldText>
	{@render children?.()}
</div>
