<script lang="ts">
	let { src, class: className = '' } = $props();
</script>

<img
	src={src ?? '/404.jpg'}
	class={className}
	onerror={(e: any) => (e.currentTarget.src = '/404.jpg')}
	alt="cover"
/>
