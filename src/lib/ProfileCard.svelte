<script lang="ts">
	import CoverArt from './CoverArt.svelte';

	let { user } = $props();
</script>

{#if user}
	<div class="fixed right-8 bottom-8 z-20">
		<a
			href="/user/{user.id}"
			class=" hover-effect-shadow flex gap-4 rounded-xl border-4 border-[#8B81FF] bg-text p-4 font-jua text-light text-shadow-flat"
		>
			<CoverArt src={user.avatarUrl} class="h-12 rounded-full" />
			<div>
				<h2 class="text-xl">
					@{user.username}
				</h2>
				<p>{user.notesBalance} notes</p>
			</div>
		</a>
	</div>
{/if}
