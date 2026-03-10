<script lang="ts">
	let { project, class: className = '' } = $props();
</script>

<div class="{className} contents">
	<a class="relative transition hover:scale-105" href="/projects/{project.id}">
		<img src="/cassette.png" alt="cassette" />
		<div
			class="absolute top-10 left-1/2 flex h-14 w-80 -translate-x-1/2 items-center justify-center"
		>
			<h1 class="line-clamp-2 text-center font-gothic text-2xl leading-tight text-text">
				{project.title}
			</h1>
		</div>
		<p
			class="absolute top-46 left-1/2 line-clamp-2 w-84 -translate-x-1/2 font-zcool text-xs leading-5"
		>
			{project.description}
		</p>
	</a>
</div>
