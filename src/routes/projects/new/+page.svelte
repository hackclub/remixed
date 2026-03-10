<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Sidebar />
<form method="POST" class="m-auto flex h-screen w-80 flex-col justify-center">
	<label class="font-nikkyou text-2xl text-primary" for="title">Title</label>
	<input
		type="text"
		id="title"
		name="title"
		class="rounded-md bg-accent p-4 font-jua font-bold text-text ring-primary focus:ring-2 focus:outline-none"
		required
	/>
	<label class="mt-4 font-nikkyou text-2xl text-primary" for="desc">Description</label>
	<textarea
		id="desc"
		name="desc"
		class="rounded-md bg-accent p-4 font-jua text-text ring-primary focus:ring-2 focus:outline-none"
	></textarea>
	<label class="mt-4 font-nikkyou text-2xl text-primary" for="category">Category</label>
	<select
		name="category"
		id="category"
		class="rounded-md bg-accent p-4 text-center font-gothic font-bold text-text ring-primary focus:ring-2 focus:outline-none"
	>
		<option value="GAME">Game</option>
		<option value="WEBSITE">Website</option>
		<option value="DESKTOP_APP">Desktop App</option>
		<option value="CLI">CLI</option>
		<option value="OTHER">Other</option>
	</select>
	<label class="mt-4 font-nikkyou text-2xl text-primary" for="category">Hackatime Projects</label>
	<select
		multiple
		name="hackatime_projects"
		id="hackatime"
		class="rounded-md bg-accent p-4 text-center font-gothic font-bold text-text ring-primary focus:ring-2 focus:outline-none"
	>
		{#each data.projects as proj}
			<option value={proj.name}>{proj.name}</option>
		{/each}
	</select>
	<sub class="mt-2 text-center font-zcool text-text">Ctrl+Click to select multiple</sub>

	<input
		type="submit"
		value="Create Project"
		class="mt-8 cursor-pointer rounded-md bg-primary p-4 font-nikkyou text-xl text-accent transition hover:scale-105"
	/>
</form>
