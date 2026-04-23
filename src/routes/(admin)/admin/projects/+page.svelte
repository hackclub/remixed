<script lang="ts">
	import { formatHours, formatProjectCategory, PROJECT_CATEGORY_OPTIONS } from '$lib';
	import type { ActionData, PageData } from './$types';

	type ProjectRow = PageData['projects'][number];
	type DeletedProjectRow = PageData['deletedProjects'][number];
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

	let { data, form }: { data: PageData; form?: ActionData } = $props();

	let activeProject = $state<EditableProject | null>(null);
	let projectSearch = $state('');
	let manageProjectPopover: HTMLElement | undefined = $state();
	let deleteProjectPopover: HTMLElement | undefined = $state();

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

	let filteredDeletedProjects = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.deletedProjects;
		return data.deletedProjects.filter((projectInfo) =>
			[
				String(projectInfo.project.originalId),
				String(projectInfo.project.userId),
				projectInfo.ownerUsername,
				projectInfo.deletedByUsername,
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

	function setActiveProject(projectInfo: ProjectRow) {
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

	function openProjectMenu(projectInfo: ProjectRow) {
		setActiveProject(projectInfo);
	}

	function confirmDeleteProject(projectInfo: ProjectRow) {
		setActiveProject(projectInfo);
		requestAnimationFrame(() => deleteProjectPopover?.showPopover());
	}

	function formatDeletedAt(project: DeletedProjectRow['project']) {
		return new Date(project.deletedAt).toLocaleString();
	}
</script>

<svelte:head><title>Projects — Admin</title></svelte:head>

<!-- Manage project popover -->
<div
	bind:this={manageProjectPopover}
	class="bg-base-200 border-base-300 max-h-[calc(100vh-2rem)] w-[min(96vw,64rem)] overflow-y-auto overscroll-contain rounded-xl border shadow-2xl"
	popover
	id="manage-project"
>
	{#if activeProject}
		<div class="border-base-300 border-b px-5 py-4">
			<h3 class="text-sm font-semibold">Edit Project</h3>
		</div>
		<div class="p-5">
			<form action="?/updateProject" method="POST" class="space-y-3">
				<input type="hidden" name="projectId" value={activeProject.id} />

				<!-- Stats summary -->
				<div class="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{#each [{ label: 'Project ID', value: String(activeProject.id) }, { label: 'Owner', value: '@' + activeProject.ownerUsername }, { label: 'Created', value: activeProject.createdAt }, { label: 'Tracked Time', value: formatHours(activeProject.stats.trackedSeconds) }, { label: 'Approved Time', value: formatHours(activeProject.stats.approvedSeconds) }, { label: 'Remaining', value: formatHours(activeProject.stats.remainingSeconds) }] as item}
						<div class="bg-base-300 rounded-lg p-3">
							<p class="text-base-content/50 text-xs">{item.label}</p>
							<p class="font-mono text-sm">{item.value}</p>
						</div>
					{/each}
					<div class="bg-base-300 col-span-2 rounded-lg p-3 sm:col-span-3">
						<p class="text-base-content/50 text-xs">Ships</p>
						<p class="text-sm">
							{activeProject.stats.shipCount} total &middot; {activeProject.stats.pendingShips} pending
							&middot; {activeProject.stats.approvedShips} approved &middot; {activeProject.stats
								.rejectedShips} rejected
						</p>
					</div>
				</div>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Owner User ID</legend>
					<input
						type="number"
						min="1"
						name="userId"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.userId}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Title</legend>
					<input
						type="text"
						name="title"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.title}
						required
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Description</legend>
					<textarea
						name="description"
						class="textarea textarea-bordered textarea-sm min-h-24 w-full"
						bind:value={activeProject.description}
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Category</legend>
					<select
						name="category"
						class="select select-bordered select-sm w-full"
						bind:value={activeProject.category}
					>
						{#each PROJECT_CATEGORY_OPTIONS as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal"
						>Hackatime Projects (one per line)</legend
					>
					<textarea
						name="hackatimeProjects"
						class="textarea textarea-bordered textarea-sm min-h-20 w-full"
						bind:value={activeProject.hackatimeProjects}
						placeholder="One project per line"
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Tracked Seconds</legend>
					<input
						type="number"
						min="0"
						name="hackatimeSeconds"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.hackatimeSeconds}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Cover Art URL</legend>
					<input
						type="url"
						name="coverArt"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeProject.coverArt}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Repository URL</legend>
					<input
						type="url"
						name="githubUrl"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeProject.githubUrl}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend text-xs font-normal">Demo URL</legend>
					<input
						type="url"
						name="demoUrl"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeProject.demoUrl}
					/>
				</fieldset>
				<div class="flex gap-2 pt-1">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => manageProjectPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" value="Save Changes" class="btn btn-sm btn-primary flex-1" />
				</div>
			</form>
		</div>
	{/if}
</div>

<!-- Delete project popover -->
<div
	bind:this={deleteProjectPopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="delete-project"
>
	{#if activeProject}
		<div class="border-base-300 border-b px-5 py-4">
			<h3 class="text-sm font-semibold">Delete {activeProject.title}?</h3>
		</div>
		<div class="p-5">
			<p class="text-base-content/60 mb-4 text-sm">
				This archives the project and all of its ships, removes them from the live tables, and keeps
				them visible in the deleted section below.
			</p>
			<form action="?/deleteProject" method="POST">
				<input type="hidden" name="projectId" value={activeProject.id} />
				<div class="flex gap-2">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => deleteProjectPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" value="Delete" class="btn btn-sm btn-error flex-1" />
				</div>
			</form>
		</div>
	{/if}
</div>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">Projects</h1>
	</div>

	{#if form?.error}
		<div class="alert alert-error text-sm">{form.error}</div>
	{/if}

	<input
		type="search"
		bind:value={projectSearch}
		class="input input-bordered input-sm w-full max-w-md"
		placeholder="Search projects, owners, categories, links, or Hackatime names"
	/>

	<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
		<table class="table-sm table-zebra table">
			<thead>
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
			<tbody>
				{#each filteredProjects as projectInfo}
					<tr>
						<td class="font-mono text-xs">{projectInfo.project.id}</td>
						<td>
							<div class="flex items-center gap-2">
								<img
									src={projectInfo.user.avatarUrl ?? '/404.jpg'}
									alt={projectInfo.user.username}
									class="h-6 w-6 shrink-0 rounded-full object-cover"
								/>
								<a href="/user/{projectInfo.user.id}" class="link link-hover">
									{projectInfo.user.username}
								</a>
							</div>
						</td>
						<td>
							<div class="flex items-center gap-2">
								{#if projectInfo.project.coverArt}
									<img
										src={projectInfo.project.coverArt}
										alt={projectInfo.project.title}
										class="h-7 w-10 shrink-0 rounded object-cover"
										onerror={(e: any) => e.currentTarget.remove()}
									/>
								{/if}
								<a href="/projects/{projectInfo.project.id}" class="link link-hover">
									{projectInfo.project.title}
								</a>
							</div>
						</td>
						<td>{formatProjectCategory(projectInfo.project.category)}</td>
						<td>{formatHours(projectInfo.stats.trackedSeconds)}</td>
						<td>{projectInfo.stats.shipCount}</td>
						<td>
							{#if projectInfo.stats.pendingShips > 0}
								<span class="badge badge-warning badge-sm">{projectInfo.stats.pendingShips}</span>
							{:else}
								{projectInfo.stats.pendingShips}
							{/if}
						</td>
						<td>
							<div class="flex gap-1">
								<button
									class="btn btn-xs btn-outline"
									onclick={() => openProjectMenu(projectInfo)}
									popovertarget="manage-project">Manage</button
								>
								<button
									type="button"
									class="btn btn-xs btn-error btn-outline"
									onclick={() => confirmDeleteProject(projectInfo)}>Delete</button
								>
							</div>
						</td>
					</tr>
				{/each}
				{#if filteredProjects.length === 0}
					<tr
						><td colspan="8" class="text-base-content/40 py-6 text-center">No projects found</td
						></tr
					>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Deleted Projects -->
	<section>
		<h2 class="text-base-content/70 mb-1 text-sm font-semibold tracking-wide uppercase">
			Deleted Projects
		</h2>
		<p class="text-base-content/50 mb-3 text-xs">Archived rows are read-only.</p>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border opacity-75">
			<table class="table-sm table-zebra table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Owner</th>
						<th>Title</th>
						<th>Category</th>
						<th>Tracked</th>
						<th>Ships</th>
						<th>Deleted</th>
						<th>Deleted By</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredDeletedProjects as projectInfo}
						<tr>
							<td class="font-mono text-xs">{projectInfo.project.originalId}</td>
							<td>{projectInfo.ownerUsername}</td>
							<td>{projectInfo.project.title}</td>
							<td>{formatProjectCategory(projectInfo.project.category)}</td>
							<td>{formatHours(projectInfo.stats.trackedSeconds)}</td>
							<td>{projectInfo.stats.shipCount}</td>
							<td class="text-xs">{formatDeletedAt(projectInfo.project)}</td>
							<td>{projectInfo.deletedByUsername}</td>
						</tr>
					{/each}
					{#if filteredDeletedProjects.length === 0}
						<tr>
							<td colspan="8" class="text-base-content/40 py-6 text-center">No deleted projects</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
