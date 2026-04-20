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
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(96vw,64rem)] max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
	popover
	id="manage-project"
>
	{#if activeProject}
		<div class="px-5 py-4 border-b border-base-300">
			<h3 class="font-semibold text-sm">Edit Project</h3>
		</div>
		<div class="p-5">
		<form action="?/updateProject" method="POST" class="space-y-3">
				<input type="hidden" name="projectId" value={activeProject.id} />

				<!-- Stats summary -->
				<div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
					{#each [
						{ label: 'Project ID', value: String(activeProject.id) },
						{ label: 'Owner', value: '@' + activeProject.ownerUsername },
						{ label: 'Created', value: activeProject.createdAt },
						{ label: 'Tracked Time', value: formatHours(activeProject.stats.trackedSeconds) },
						{ label: 'Approved Time', value: formatHours(activeProject.stats.approvedSeconds) },
						{ label: 'Remaining', value: formatHours(activeProject.stats.remainingSeconds) },
					] as item}
						<div class="bg-base-300 rounded-lg p-3">
							<p class="text-xs text-base-content/50">{item.label}</p>
							<p class="text-sm font-mono">{item.value}</p>
						</div>
					{/each}
					<div class="bg-base-300 rounded-lg p-3 col-span-2 sm:col-span-3">
						<p class="text-xs text-base-content/50">Ships</p>
						<p class="text-sm">
							{activeProject.stats.shipCount} total &middot; {activeProject.stats.pendingShips} pending
							&middot; {activeProject.stats.approvedShips} approved &middot; {activeProject.stats
								.rejectedShips} rejected
						</p>
					</div>
				</div>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Owner User ID</legend>
					<input
						type="number"
						min="1"
						name="userId"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.userId}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Title</legend>
					<input
						type="text"
						name="title"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.title}
						required
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Description</legend>
					<textarea
						name="description"
						class="textarea textarea-bordered textarea-sm w-full min-h-24"
						bind:value={activeProject.description}
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Category</legend>
					<select name="category" class="select select-bordered select-sm w-full" bind:value={activeProject.category}>
						{#each PROJECT_CATEGORY_OPTIONS as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Hackatime Projects (one per line)</legend>
					<textarea
						name="hackatimeProjects"
						class="textarea textarea-bordered textarea-sm w-full min-h-20"
						bind:value={activeProject.hackatimeProjects}
						placeholder="One project per line"
					></textarea>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Tracked Seconds</legend>
					<input
						type="number"
						min="0"
						name="hackatimeSeconds"
						class="input input-bordered input-sm w-full"
						bind:value={activeProject.hackatimeSeconds}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Cover Art URL</legend>
					<input
						type="url"
						name="coverArt"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeProject.coverArt}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Repository URL</legend>
					<input
						type="url"
						name="githubUrl"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeProject.githubUrl}
					/>
				</fieldset>
				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Demo URL</legend>
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
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(90vw,36rem)]"
	popover
	id="delete-project"
>
	{#if activeProject}
		<div class="px-5 py-4 border-b border-base-300">
			<h3 class="font-semibold text-sm">Delete {activeProject.title}?</h3>
		</div>
		<div class="p-5">
			<p class="text-sm text-base-content/60 mb-4">
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

	<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
		<table class="table table-sm table-zebra">
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
								<img src={projectInfo.user.avatarUrl ?? '/404.jpg'} alt={projectInfo.user.username} class="w-6 h-6 rounded-full object-cover shrink-0" />
								<a href="/user/{projectInfo.user.id}" class="link link-hover">
									{projectInfo.user.username}
								</a>
							</div>
						</td>
						<td>
							<div class="flex items-center gap-2">
								{#if projectInfo.project.coverArt}
									<img src={projectInfo.project.coverArt} alt={projectInfo.project.title} class="w-10 h-7 rounded object-cover shrink-0" onerror={(e: any) => e.currentTarget.remove()} />
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
					<tr><td colspan="8" class="text-center text-base-content/40 py-6">No projects found</td></tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Deleted Projects -->
	<section>
		<h2 class="text-sm font-semibold text-base-content/70 uppercase tracking-wide mb-1">
			Deleted Projects
		</h2>
		<p class="text-xs text-base-content/50 mb-3">Archived rows are read-only.</p>
		<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100 opacity-75">
			<table class="table table-sm table-zebra">
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
							<td colspan="8" class="text-center text-base-content/40 py-6">No deleted projects</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
