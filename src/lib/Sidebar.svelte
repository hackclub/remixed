<script lang="ts">
	const records = [
		{ name: 'Dashboard', route: '/dashboard' },
		{ name: 'Projects', route: '/projects' },
		{ name: 'Discover', route: '/' }
	];
</script>

<div class="fixed h-screen py-32">
	{#each records as record}
		<a
			href={record.route}
			class="relative -left-16 flex h-30 w-30 -rotate-90 rounded-full bg-red-500 transition-all duration-200 hover:left-0 hover:rotate-45"
		>
			<h1 class="mt-4 w-full text-center">{record.name}</h1>
		</a>
	{/each}
</div>
