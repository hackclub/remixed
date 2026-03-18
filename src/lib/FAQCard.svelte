<script lang="ts">
	let { children, title } = $props();
</script>

<div class="max-w-md rounded-2xl border-4 border-light bg-[#435D96] p-8">
	<div class="relative font-jua text-3xl">
		<h1 class="text-stroke text-stroke-2 bg-light">{title}</h1>
		<h1 class="text-dark-gradient absolute top-0 p-1">{title}</h1>
	</div>
	{@render children?.()}
</div>
