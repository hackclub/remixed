<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { formatHours, validUrl } from '$lib';
	import { scale } from 'svelte/transition';
	import { styleButton, styleH1, styleInput, stylePopover } from '$lib/styles';

	let { data }: PageProps = $props();

	let hackatimeProjects: null | any[] = $state(null);
	let hoursText: string = $state('LOADING');
	let editing: boolean = $state(false);

	let draft = $state({ ...data.project });
	let anim = $state(false);

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
		anim = true;
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
{#if anim}
	<div class="h-screen pt-8 pr-8 pl-40">
		<main class="mx-auto flex h-full w-full items-center">
			<form method="POST" action="?/update">
				<div popover id="hackatime-project-select" class={stylePopover}>
					<h1 class="text-center font-nikkyou text-2xl text-text">Hackatime Projects</h1>
					<select
						multiple
						name="hackatimeProjects"
						class="w-full rounded-md bg-primary p-4 text-center font-gothic font-bold text-text ring-primary focus:ring-2 focus:outline-none"
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
					<sub class="mt-2 block text-center font-zcool text-text"
						>Ctrl+Click to select multiple</sub
					>
				</div>
				<div class="relative grid w-full grid-cols-2 gap-8 rounded-sm bg-text shadow-lg">
					<div
						transition:scale={{ duration: 600 }}
						class="absolute top-1/2 left-1/2 h-9/10 -translate-1/2 rounded-xl border-2 border-secondary"
					></div>
					<div class="flex w-full flex-col p-4">
						{#if editing}
							<input
								type="text"
								name="title"
								bind:value={draft.title}
								class="{styleInput} mb-4 text-center font-nikkyou text-5xl text-primary"
							/>
						{:else}
							<h1 class="{styleH1} text-primary">{draft.title}</h1>
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
									class="mb-2 cursor-pointer rounded-md bg-accent-purple px-4 py-2 font-nikkyou text-2xl text-text"
								>
									Hackatime
								</button>
								<select
									name="category"
									id="category"
									bind:value={draft.category}
									class="{styleInput} mb-2 cursor-pointer text-center font-gothic text-sm font-bold text-text"
								>
									<option value="GAME">Game</option>
									<option value="WEBSITE">Website</option>
									<option value="DESKTOP_APP">Desktop App</option>
									<option value="CLI">CLI</option>
									<option value="OTHER">Other</option>
								</select>
							{:else}
								<span
									class="font-gothic text-xl text-accent-purple"
									title={data.project!.hackatimeProjects!.join(', ')}
								>
									{hoursText}
								</span>
								<span
									class=" font-gothic text-xl text-accent-purple"
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
								class="{styleInput} h-0 grow overflow-auto font-jua text-text"
							>
							</textarea>
							<p class="mt-2 text-center font-gothic text-xs text-accent-red">
								Markdown is supported!
							</p>
						{:else}
							<div
								class="prose mt-4 h-0 grow overflow-auto font-jua text-light prose-headings:text-accent-red prose-a:text-accent-purple prose-strong:text-accent-red prose-code:text-accent-purple"
							>
								{@html data.descriptionHtml}
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
									class="{styleInput} w-full font-mono text-xs text-text"
								/>
								<p class="mt-2 rounded-md bg-accent-purple p-2 text-center font-zcool text-sm">
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
					{#if editing}
						<input
							placeholder="Github URL"
							type="text"
							name="githubUrl"
							bind:value={draft.githubUrl}
							class="{styleInput} w-full font-mono text-xs text-text"
						/>
					{:else if validUrl(data.project?.githubUrl ?? null)}
						<a href={data.project?.githubUrl} class="{styleButton} w-full bg-primary">
							Repository
						</a>
					{/if}

					{#if editing}
						<input
							placeholder="Demo URL"
							type="text"
							name="demoUrl"
							bind:value={draft.demoUrl}
							class="{styleInput} w-full font-mono text-xs text-text"
						/>
					{:else if validUrl(data.project?.demoUrl ?? null)}
						<a href={data.project?.demoUrl} class="{styleButton} w-full bg-primary"> Demo </a>
					{/if}

					{#if !editing}
						{#if !data.hasPendingShip && validUrl(data.project?.demoUrl ?? null) && validUrl(data.project?.githubUrl ?? null) && data.project?.hackatimeProjects.length != 0}
							<button type="submit" form="ship-form" class="{styleButton} w-full bg-primary">
								Ship
							</button>
						{/if}
					{/if}

					{#if !editing}
						<button class="{styleButton} w-full bg-secondary" onclick={startEdit}> Edit </button>
					{:else}
						<button type="button" class="{styleButton} w-full bg-secondary" onclick={cancelEdit}>
							Cancel
						</button>
						<button type="submit" class="{styleButton} w-full bg-secondary" formaction="?/update">
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
{/if}
