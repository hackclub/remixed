<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { formatHours } from '$lib';

	let { data }: PageProps = $props();

	let hackatimeProjects: null | any[] = $state(null);
	let hoursText: string = $state('LOADING');
	let editing: boolean = $state(false);

	let draft = $state({ ...data.project });

	const isOwner = data.currentUserId == data.project?.userId;

	function startEdit() {
		editing = true;
		if (hackatimeProjects == null) {
			fetch('/api/hackatime')
				.then((resp) => resp.json())
				.then((r) => (hackatimeProjects = r));
		}
	}

	function cancelEdit() {
		draft = { ...data.project };
		editing = false;
	}

	onMount(() => {
		if (isOwner) {
			fetch(`/api/project_time?id=${data.project!.id}`)
				.then((resp) => resp.text())
				.then((text) => (hoursText = formatHours(Number(text))));
		}
	});

	if (data.project!.hackatimeSeconds) {
		hoursText = formatHours(data.project!.hackatimeSeconds);
	}
</script>

<Sidebar />
<div class="h-screen pt-8 pr-8 pl-40">
	<main class="mx-auto flex h-full w-200 items-center">
		<form method="POST" action="?/update">
			<div class="flex w-full flex-row justify-evenly gap-8">
				<!-- TODO: make the cover art like balatro or smth -->
				<div>
					<img
						src={draft?.coverArt ?? '/404.jpg'}
						onerror={(e: any) => (e.currentTarget.src = '/404.jpg')}
						alt="cover art"
						class="mb-4 aspect-square h-80 min-w-80 object-cover"
					/>
					{#if editing}
						<input
							type="text"
							name="coverArt"
							bind:value={draft.coverArt}
							class="w-full rounded-md bg-accent px-4 py-2 font-mono text-xs text-text ring-primary outline-none focus:ring-2"
						/>
						<p class="mb-4 text-center font-zcool text-sm">
							Upload images to <a
								class="underline"
								href="https://hackclub.enterprise.slack.com/archives/C016DEDUL87">#cdn</a
							>
							or <a class="underline" href="https://cdn.hackclub.com/">cdn.hackclub.com</a>
						</p>
					{/if}
					{#if editing}
						<select
							multiple
							name="hackatimeProjects"
							class="w-full rounded-md bg-accent p-4 text-center font-gothic font-bold text-text ring-primary focus:ring-2 focus:outline-none"
						>
							{#each hackatimeProjects as proj}
								{#if proj.claimedBy == null}
									<option selected={proj.claimedBy == data.project!.id} value={proj.name}>
										{proj.name}
									</option>
								{:else}
									<option disabled value={proj.name}>{proj.name}</option>
								{/if}
							{/each}
						</select>
						<sub class="mt-2 mb-4 block text-center font-zcool text-text"
							>Ctrl+Click to select multiple</sub
						>
					{:else}
						<p
							class="text-center font-gothic text-xl text-primary"
							title={data.project!.hackatimeProjects!.join(', ')}
						>
							{hoursText}
						</p>
					{/if}
					{#if editing}
						<select
							name="category"
							id="category"
							bind:value={draft.category}
							class="w-full rounded-md bg-accent p-2 text-center font-gothic text-sm font-bold text-text ring-primary focus:ring-2 focus:outline-none"
						>
							<option value="GAME">Game</option>
							<option value="WEBSITE">Website</option>
							<option value="DESKTOP_APP">Desktop App</option>
							<option value="CLI">CLI</option>
							<option value="OTHER">Other</option>
						</select>
					{:else}
						<p class="text-center font-gothic text-sm text-secondary italic">
							{data.project?.category.replaceAll('_', ' ')}
						</p>
					{/if}
				</div>
				<div class="w-md">
					{#if editing}
						<textarea
							bind:value={draft.title}
							name="title"
							rows="1"
							class="mb-4 field-sizing-content w-full resize-none rounded-md bg-accent px-4 py-2 font-nikkyou text-5xl text-primary ring-primary outline-none focus:ring-2"
						></textarea>
						<textarea
							bind:value={draft.description}
							name="description"
							class="field-sizing-content min-h-80 w-full rounded-md bg-accent p-4 font-zcool text-text ring-primary outline-none focus:ring-2"
						></textarea>
					{:else}
						<h1 class="mb-4 font-nikkyou text-5xl text-primary">{data.project?.title}</h1>
						{#if data.project?.description!.trim().length != 0}
							<p class="w-full font-zcool text-text">{data.project?.description}</p>
						{:else}
							<p class="text-center font-zcool text-xl text-secondary">No Description Provided</p>
						{/if}
					{/if}
				</div>
			</div>

			<div class="mt-8 flex gap-4">
				<!-- TODO: add like a play icon like its a play button on a boombox or smth -->
				{#if editing}
					<input
						placeholder="Github URL"
						type="text"
						name="githubUrl"
						bind:value={draft.githubUrl}
						class="w-full rounded-md bg-accent px-4 py-2 font-mono text-xs text-text ring-primary outline-none focus:ring-2"
					/>
				{:else if data.project?.githubUrl}
					<a
						href={data.project.githubUrl}
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
					>
						Repository
					</a>
				{/if}

				{#if editing}
					<input
						placeholder="Demo URL"
						type="text"
						name="demoUrl"
						bind:value={draft.demoUrl}
						class="w-full rounded-md bg-accent px-4 py-2 font-mono text-xs text-text ring-primary outline-none focus:ring-2"
					/>
				{:else if data.project?.demoUrl}
					<a
						href={data.project.demoUrl}
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
					>
						Demo
					</a>
				{/if}

				{#if !editing}
					{#if !data.hasPendingShip}
						<button
							type="submit"
							form="ship-form"
							class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						>
							Ship
						</button>
					{/if}
				{/if}

				{#if !editing}
					<button
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						onclick={startEdit}
					>
						Edit
					</button>
				{:else}
					<button
						type="button"
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						onclick={cancelEdit}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						formaction="?/update"
					>
						Submit
					</button>
				{/if}
			</div>
		</form>
	</main>
	<form action="?/ship" method="POST" id="ship-form" hidden></form>
</div>
