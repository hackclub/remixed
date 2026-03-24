<script lang="ts">
	import { formatHours, formatProjectCategory, PROJECT_CATEGORY_OPTIONS } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';
	import type { PageData } from './$types';

	type ProjectRow = PageData['projects'][number];
	type EditableProject = {
		id: number;
		userId: number;
		title: string;
		description: string;
		coverArt: string;
		category: ProjectRow['project']['category'];
		hackatimeProjects: string;
		hackatimeSeconds: string;
		githubUrl: string;
		demoUrl: string;
		createdAt: string;
		ownerUsername: string;
		stats: ProjectRow['stats'];
	};

	let { data }: { data: PageData } = $props();

	let activeProject = $state<EditableProject | null>(null);
	let projectSearch = $state('');
	let manageProjectPopover: HTMLElement | undefined = $state();

	let filteredProjects = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.projects;

		return data.projects.filter((projectInfo) =>
			[
				String(projectInfo.project.id),
				String(projectInfo.project.userId),
				projectInfo.user.username,
				projectInfo.project.title,
				projectInfo.project.category,
				formatProjectCategory(projectInfo.project.category),
				projectInfo.project.description ?? '',
				projectInfo.project.githubUrl ?? '',
				projectInfo.project.demoUrl ?? '',
				projectInfo.project.hackatimeProjects.join(' '),
			].some((value) => value.toLowerCase().includes(query)),
		);
	});

	function openProjectMenu(projectInfo: ProjectRow) {
		activeProject = {
			id: projectInfo.project.id,
			userId: projectInfo.project.userId,
			title: projectInfo.project.title,
			description: projectInfo.project.description ?? '',
			coverArt: projectInfo.project.coverArt ?? '',
			category: projectInfo.project.category,
			hackatimeProjects: projectInfo.project.hackatimeProjects.join('\n'),
			hackatimeSeconds:
				projectInfo.project.hackatimeSeconds == null
					? ''
					: String(projectInfo.project.hackatimeSeconds),
			githubUrl: projectInfo.project.githubUrl ?? '',
			demoUrl: projectInfo.project.demoUrl ?? '',
			createdAt: new Date(projectInfo.project.createdAt).toLocaleString(),
			ownerUsername: projectInfo.user.username,
			stats: projectInfo.stats,
		};
	}
</script>

<div
	bind:this={manageProjectPopover}
	class="{styleAdminPopover} w-[min(96vw,64rem)] max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
	popover
	id="manage-project"
>
	{#if activeProject}
		<form action="?/updateProject" method="POST" class="space-y-4">
			<input type="hidden" name="projectId" value={activeProject.id} />

			<div class="project-summary grid font-jua text-sm text-light sm:grid-cols-2">
				<div class="project-summary__item">
					<p class="project-summary__label">Project ID</p>
					<p class="project-summary__value">{activeProject.id}</p>
				</div>
				<div class="project-summary__item">
					<p class="project-summary__label">Owner</p>
					<p class="project-summary__value">@{activeProject.ownerUsername}</p>
				</div>
				<div class="project-summary__item">
					<p class="project-summary__label">Created</p>
					<p>{activeProject.createdAt}</p>
				</div>
				<div class="project-summary__item">
					<p class="project-summary__label">Tracked Time</p>
					<p>{formatHours(activeProject.stats.trackedSeconds)}</p>
				</div>
				<div class="project-summary__item">
					<p class="project-summary__label">Approved Time</p>
					<p>{formatHours(activeProject.stats.approvedSeconds)}</p>
				</div>
				<div class="project-summary__item">
					<p class="project-summary__label">Remaining Time</p>
					<p>{formatHours(activeProject.stats.remainingSeconds)}</p>
				</div>
				<div class="project-summary__item sm:col-span-2">
					<p class="project-summary__label">Ships</p>
					<p>
						{activeProject.stats.shipCount} total, {activeProject.stats.pendingShips} pending,
						{activeProject.stats.approvedShips} approved, {activeProject.stats.rejectedShips}
						rejected
					</p>
				</div>
			</div>

			<label for="userId" class="block font-jua text-2xl text-light">Owner User ID</label>
			<input
				type="number"
				min="1"
				id="userId"
				name="userId"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeProject.userId}
			/>

			<label for="title" class="block font-jua text-2xl text-light">Title</label>
			<input
				type="text"
				id="title"
				name="title"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeProject.title}
				required
			/>

			<label for="description" class="block font-jua text-2xl text-light">Description</label>
			<textarea
				id="description"
				name="description"
				class="{styleInput} min-h-32 w-full font-jua text-text"
				bind:value={activeProject.description}
			></textarea>

			<label for="category" class="block font-jua text-2xl text-light">Category</label>
			<select
				id="category"
				name="category"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeProject.category}
			>
				{#each PROJECT_CATEGORY_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<label for="hackatimeProjects" class="block font-jua text-2xl text-light">
				Hackatime Projects
			</label>
			<textarea
				id="hackatimeProjects"
				name="hackatimeProjects"
				class="{styleInput} min-h-28 w-full font-jua text-text"
				bind:value={activeProject.hackatimeProjects}
				placeholder="One project per line"
			></textarea>

			<label for="hackatimeSeconds" class="block font-jua text-2xl text-light">
				Tracked Seconds
			</label>
			<input
				type="number"
				min="0"
				id="hackatimeSeconds"
				name="hackatimeSeconds"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeProject.hackatimeSeconds}
			/>

			<label for="coverArt" class="block font-jua text-2xl text-light">Cover Art URL</label>
			<input
				type="url"
				id="coverArt"
				name="coverArt"
				class="{styleInput} w-full font-mono text-xs text-text"
				bind:value={activeProject.coverArt}
			/>

			<label for="githubUrl" class="block font-jua text-2xl text-light">Repository URL</label>
			<input
				type="url"
				id="githubUrl"
				name="githubUrl"
				class="{styleInput} w-full font-mono text-xs text-text"
				bind:value={activeProject.githubUrl}
			/>

			<label for="demoUrl" class="block font-jua text-2xl text-light">Demo URL</label>
			<input
				type="url"
				id="demoUrl"
				name="demoUrl"
				class="{styleInput} w-full font-mono text-xs text-text"
				bind:value={activeProject.demoUrl}
			/>

			<div class="flex gap-3 pt-2">
				<button
					type="button"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					onclick={() => manageProjectPopover?.hidePopover()}>Cancel</button
				>
				<input
					type="submit"
					value="Confirm"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				/>
			</div>
		</form>
	{/if}
</div>

<div class="p-10 pb-40 font-jua text-text">
	<div class="mb-6">
		<input
			type="search"
			bind:value={projectSearch}
			class="{styleInput} w-full max-w-xl border-2 border-text font-jua text-lg"
			placeholder="Search projects, owners, categories, links, or Hackatime names"
		/>
	</div>

	<table class="admin-table w-full bg-accent-purple">
		<thead class="font-jua text-text">
			<tr>
				<th>ID</th>
				<th>Owner</th>
				<th>Title</th>
				<th>Category</th>
				<th>Tracked</th>
				<th>Ships</th>
				<th>Pending</th>
				<th>Actions</th>
			</tr>
		</thead>
		<tbody class="font-jua text-text">
			{#each filteredProjects as projectInfo}
				<tr>
					<td>{projectInfo.project.id}</td>
					<td>
						<a href="/user/{projectInfo.user.id}">
							{projectInfo.user.username}
						</a>
					</td>
					<td>
						<a href="/projects/{projectInfo.project.id}">
							{projectInfo.project.title}
						</a>
					</td>
					<td>{formatProjectCategory(projectInfo.project.category)}</td>
					<td>{formatHours(projectInfo.stats.trackedSeconds)}</td>
					<td>{projectInfo.stats.shipCount}</td>
					<td>{projectInfo.stats.pendingShips}</td>
					<td>
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							onclick={() => openProjectMenu(projectInfo)}
							popovertarget="manage-project">Manage</button
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.admin-table {
		border: 2px solid var(--color-text);
		border-collapse: separate;
		border-radius: 1rem;
		border-spacing: 0;
		overflow: hidden;
	}
	th,
	td {
		border-right: 1px solid var(--color-text);
		border-bottom: 1px solid var(--color-text);
		padding: 4px 8px;
	}
	th:last-child,
	td:last-child {
		border-right: none;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
	a {
		text-decoration: underline;
	}
	.project-summary {
		border: 2px solid var(--color-accent-purple);
		border-radius: 1rem;
		border-collapse: separate;
		border-spacing: 0;
		background: var(--color-text);
		overflow: hidden;
	}
	.project-summary__item {
		border-right: 1px solid rgb(139 129 255 / 0.4);
		border-bottom: 1px solid rgb(139 129 255 / 0.4);
		padding: 1rem;
	}
	.project-summary__label {
		margin-bottom: 0.35rem;
		color: rgb(255 255 255 / 0.7);
	}
	.project-summary__value {
		font-size: 1.125rem;
	}
	.project-summary__item:nth-child(2n) {
		border-right: none;
	}
	.project-summary__item:last-child {
		border-bottom: none;
	}
	@media (max-width: 639px) {
		.project-summary__item {
			border-right: none;
		}
		.project-summary__item:not(:last-child) {
			border-bottom: 1px solid rgb(139 129 255 / 0.4);
		}
	}
</style>
