<script lang="ts">
	import CassetteProject from '$lib/CassetteProject.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let hoursText: string = $state('');
	let editing: boolean = $state(false);
	let draft = $state({ ...data.project });

	const isOwner = data.currentUserId == data.project?.userId;

	function formatHoursText() {
		if (data.hackatimeSeconds == null) return;
		const minutes = data.hackatimeSeconds! / 60.0;
		const hours = Math.floor(minutes / 60.0);
		const minuteTextRaw = String(minutes - hours * 60);
		const minuteText = minuteTextRaw.slice(0, minuteTextRaw.indexOf('.'));
		hoursText = `${hours}h ${minuteText}m`;
	}

	function cancelEdit() {
		draft = { ...data.project };
		editing = false;
	}

	formatHoursText();
</script>

<Sidebar />
<div class="pt-8 pr-8 pl-40">
	<main class="mx-auto w-200">
		<form method="POST" action="?/update">
			<div class="flex w-full flex-row justify-evenly gap-8">
				<!-- TODO: make the cover art like balatro or smth -->
				<div>
					<img
						src={data.project?.coverArt ?? '/gup.webp'}
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
							class="rounded-md bg-accent p-4 text-center font-gothic font-bold text-text ring-primary focus:ring-2 focus:outline-none"
						>
						</select>
					{:else}
						<p class="text-center font-gothic text-xl text-primary">{hoursText}</p>
					{/if}
					<p class="text-center font-gothic text-sm text-secondary italic">
						{data.project?.category.replaceAll('_', ' ')}
					</p>
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
			<div class="mt-8 flex gap-8">
				<!-- TODO: add like a play icon like its a play button on a boombox or smth -->
				{#if data.project?.githubUrl}
					<a
						href={data.project.githubUrl}
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
					>
						Repository
					</a>
				{/if}

				{#if data.project?.demoUrl}
					<a
						href={data.project.demoUrl}
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
					>
						Demo
					</a>
				{/if}

				{#if !editing}
					<button
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						onclick={() => (editing = true)}
					>
						Edit
					</button>
				{:else}
					<button
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						onclick={() => (editing = false)}
					>
						Cancel
					</button>
					<button
						class="w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xl text-accent"
						formaction="?/update"
					>
						Submit
					</button>
				{/if}
			</div>
		</form>
	</main>
</div>
