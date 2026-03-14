<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { formatHours, validUrl } from '$lib';

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
	<main class="mx-auto flex h-full w-full items-center">
		<form method="POST" action="?/update">
			<div
				popover
				id="hackatime-project-select"
				class="popover fixed top-1/2 left-1/2 w-90 -translate-1/2 rounded-md bg-secondary p-4 shadow-xl"
			>
				<h1 class="text-center font-nikkyou text-2xl text-text">Hackatime Projects</h1>
				<select
					multiple
					name="hackatimeProjects"
					class="w-full rounded-md bg-primary p-4 text-center font-gothic font-bold text-accent ring-primary focus:ring-2 focus:outline-none"
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
				<sub class="mt-2 block text-center font-zcool text-text">Ctrl+Click to select multiple</sub>
			</div>
			<div class="grid w-full grid-cols-2 gap-8 bg-black">
				<div class="flex w-full flex-col bg-text p-4">
					{#if editing}
						<input
							type="text"
							name="title"
							bind:value={draft.title}
							class="mb-4 rounded-md bg-accent px-4 py-2 text-center font-nikkyou text-5xl text-primary ring-secondary outline-none focus:ring-2"
						/>
					{:else}
						<h1 class="text-center font-nikkyou text-5xl text-primary">{draft.title}</h1>
						<a
							href="/user/{data.user.id}"
							class="mb-4 text-center font-nikkyou text-xl text-primary underline"
							>{data.user.username}</a
						>
					{/if}
					<div class="flex justify-between">
						{#if editing}
							<button
								type="button"
								popovertarget="hackatime-project-select"
								class="mb-2 cursor-pointer rounded-md bg-accent p-2 font-gothic text-text"
							>
								Hackatime
							</button>
							<select
								name="category"
								id="category"
								bind:value={draft.category}
								class="mb-2 cursor-pointer rounded-md bg-accent p-2 text-center font-gothic text-sm font-bold text-text ring-primary focus:ring-2 focus:outline-none"
							>
								<option value="GAME">Game</option>
								<option value="WEBSITE">Website</option>
								<option value="DESKTOP_APP">Desktop App</option>
								<option value="CLI">CLI</option>
								<option value="OTHER">Other</option>
							</select>
						{:else}
							<span
								class="font-gothic text-xl text-accent"
								title={data.project!.hackatimeProjects!.join(', ')}
							>
								{hoursText}
							</span>
							<span
								class="font-gothic text-xl text-accent"
								title={data.project!.hackatimeProjects!.join(', ')}
							>
								{data.project?.category.replaceAll('_', ' ')}
							</span>
						{/if}
					</div>

					{#if editing}
						<textarea
							name="description"
							bind:value={draft.description}
							class="h-0 grow overflow-auto rounded-md bg-accent p-2 text-center font-zcool text-text ring-secondary outline-none focus:ring-2"
						>
						</textarea>
					{:else}
						<div class="h-0 grow overflow-auto whitespace-break-spaces text-accent">
							<p class="text-center font-zcool">
								{draft.description}
							</p>
						</div>
					{/if}
				</div>
				<div class="relative m-4 aspect-square">
					<img
						src="/cd.png"
						alt="cd"
						class="cd-spin absolute z-1 aspect-square w-full animate-spin object-cover opacity-30"
					/>
					<img
						src={draft?.coverArt ?? '/404.jpg'}
						onerror={(e: any) => (e.currentTarget.src = '/404.jpg')}
						alt="cover art"
						class="cd-spin aspect-square w-full animate-spin mask-[url(/cd.png)] mask-cover object-cover"
					/>
					{#if editing}
						<div class="absolute bottom-8 left-1/2 z-2 w-9/10 -translate-x-1/2">
							<input
								type="text"
								name="coverArt"
								placeholder="Image URL"
								bind:value={draft.coverArt}
								class="w-full rounded-md bg-accent px-4 py-2 font-mono text-xs text-text ring-primary outline-none focus:ring-2"
							/>
							<p class="mt-2 rounded-md bg-accent p-2 text-center font-zcool text-sm">
								Upload images to <a
									class="underline"
									href="https://hackclub.enterprise.slack.com/archives/C016DEDUL87">#cdn</a
								>
								or <a class="underline" href="https://cdn.hackclub.com/">cdn.hackclub.com</a>
							</p>
						</div>
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
				{:else if validUrl(data.project?.githubUrl ?? null)}
					<a
						href={data.project?.githubUrl}
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
				{:else if validUrl(data.project?.demoUrl ?? null)}
					<a
						href={data.project?.demoUrl}
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
					>
						Demo
					</a>
				{/if}

				{#if !editing}
					{#if !data.hasPendingShip && validUrl(data.project?.demoUrl ?? null) && validUrl(data.project?.githubUrl ?? null)}
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

<style>
	.cd-spin {
		--animate-spin: spin 8s linear infinite;
	}
</style>
