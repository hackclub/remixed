<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours, formatProjectCategory } from '$lib';

	let { data }: { data: PageData } = $props();
	const isOrg = $derived(data.roles?.includes('ORGANIZER') ?? false);
	type ShipRow = PageData['pendingShips'][number];
	type DeletedShipRow = PageData['deletedShips'][number];

	let projectSearch = $state('');

	function matchesQuery(shipInfo: ShipRow, query: string) {
		return [
			String(shipInfo.ship.projectId),
			String(shipInfo.ship.id),
			shipInfo.user.username,
			shipInfo.user.slackId,
			shipInfo.project.title,
			shipInfo.project.category,
			formatProjectCategory(shipInfo.project.category),
			shipInfo.project.githubUrl ?? '',
			shipInfo.project.demoUrl ?? '',
			shipInfo.project.hackatimeProjects.join(' '),
			shipInfo.ship.status,
			shipInfo.ship.feedback ?? '',
		].some((value) => value.toLowerCase().includes(query));
	}

	function matchesDeletedQuery(shipInfo: DeletedShipRow, query: string) {
		return [
			String(shipInfo.ship.projectId),
			String(shipInfo.ship.originalId),
			shipInfo.username,
			shipInfo.deletedByUsername,
			shipInfo.project?.title ?? '',
			shipInfo.project?.category ?? '',
			shipInfo.project ? formatProjectCategory(shipInfo.project.category) : '',
			shipInfo.project?.githubUrl ?? '',
			shipInfo.project?.demoUrl ?? '',
			shipInfo.project?.hackatimeProjects.join(' ') ?? '',
			shipInfo.ship.status,
			shipInfo.ship.feedback ?? '',
		].some((value) => value.toLowerCase().includes(query));
	}

	let filteredPendingShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.pendingShips;
		return data.pendingShips.filter((shipInfo) => matchesQuery(shipInfo, query));
	});

	let filteredReviewerApprovedShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.reviewerApprovedShips;
		return data.reviewerApprovedShips.filter((shipInfo) => matchesQuery(shipInfo, query));
	});

	let filteredReviewedShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.reviewedShips;
		return data.reviewedShips.filter((shipInfo) => matchesQuery(shipInfo, query));
	});

	let filteredDeletedShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.deletedShips;
		return data.deletedShips.filter((shipInfo) => matchesDeletedQuery(shipInfo, query));
	});
</script>

<svelte:head><title>Ship Reviews — Admin</title></svelte:head>

<div class="space-y-8">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">Ship Reviews</h1>
	</div>

	<input
		type="search"
		bind:value={projectSearch}
		class="input input-bordered input-sm w-full max-w-md"
		placeholder="Search projects, users, Hackatime IDs, reviews, or links"
	/>

	<!-- Pending Reviews -->
	<section>
		<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
			Pending Reviews ({filteredPendingShips.length})
		</h2>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
			<table class="table-sm table-zebra table">
				<thead>
					<tr>
						<th>Ship</th>
						<th>User</th>
						<th>Title</th>
						<th>Category</th>
						<th>Hackatime</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredPendingShips as shipInfo}
						<tr
							class="hover cursor-pointer"
							onclick={() => window.open(`/admin/ships/${shipInfo.project.id}`, '_blank')}
						>
							<td class="font-mono text-xs">#{shipInfo.ship.id}</td>
							<td>
								<div class="flex items-center gap-2">
									<img
										src={shipInfo.user.avatarUrl ?? '/404.jpg'}
										alt={shipInfo.user.username}
										class="h-6 w-6 shrink-0 rounded-full object-cover"
									/>
									{shipInfo.user.username}
								</div>
							</td>
							<td>{shipInfo.project.title}</td>
							<td>{formatProjectCategory(shipInfo.project.category)}</td>
							<td>
								{#if shipInfo.project.hackatimeProjects.length}
									<div class="text-base-content/70 max-w-48 text-xs">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-base-content/30">—</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
						</tr>
					{/each}
					{#if filteredPendingShips.length === 0}
						<tr
							><td colspan="6" class="text-base-content/40 py-6 text-center">No pending ships</td
							></tr
						>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Awaiting HQ -->
	{#if filteredReviewerApprovedShips.length > 0}
		<section>
			<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
				Awaiting HQ Approval ({filteredReviewerApprovedShips.length})
			</h2>
			<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
				<table class="table-sm table-zebra table">
					<thead>
						<tr>
							<th>Ship</th>
							<th>User</th>
							<th>Title</th>
							<th>Time</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredReviewerApprovedShips as shipInfo}
							<tr
								class="hover cursor-pointer"
								onclick={() => window.open(`/admin/ships/${shipInfo.project.id}`, '_blank')}
							>
								<td class="font-mono text-xs">#{shipInfo.ship.id}</td>
								<td>
									<div class="flex items-center gap-2">
										<img
											src={shipInfo.user.avatarUrl ?? '/404.jpg'}
											alt={shipInfo.user.username}
											class="h-6 w-6 shrink-0 rounded-full object-cover"
										/>
										{shipInfo.user.username}
									</div>
								</td>
								<td>{shipInfo.project.title}</td>
								<td>{formatHours(shipInfo.ship.seconds)}</td>
								<td><span class="badge badge-warning badge-sm">Awaiting HQ</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- Reviewed Ships -->
	<section>
		<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
			Reviewed Ships
		</h2>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
			<table class="table-sm table-zebra table">
				<thead>
					<tr>
						<th>Ship</th>
						<th>User</th>
						<th>Title</th>
						<th>Status</th>
						<th>Time</th>
						<th>Feedback</th>
						{#if isOrg}<th>Actions</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each filteredReviewedShips as shipInfo}
						<tr
							class="hover cursor-pointer"
							onclick={(e) => {
								if ((e.target as HTMLElement).closest('form, button')) return;
								window.open(`/admin/ships/${shipInfo.project.id}`, '_blank');
							}}
						>
							<td class="font-mono text-xs">#{shipInfo.ship.id}</td>
							<td>
								<div class="flex items-center gap-2">
									<img
										src={shipInfo.user.avatarUrl ?? '/404.jpg'}
										alt={shipInfo.user.username}
										class="h-6 w-6 shrink-0 rounded-full object-cover"
									/>
									{shipInfo.user.username}
								</div>
							</td>
							<td>{shipInfo.project.title}</td>
							<td>
								{#if shipInfo.ship.status === 'APPROVED'}
									<span class="badge badge-success badge-sm">Approved</span>
								{:else if shipInfo.ship.status === 'REJECTED'}
									<span class="badge badge-error badge-sm">Rejected</span>
								{:else}
									<span class="badge badge-ghost badge-sm">{shipInfo.ship.status}</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td class="text-base-content/70 max-w-xs truncate text-xs"
								>{shipInfo.ship.feedback ?? '—'}</td
							>
							{#if isOrg}
								<td>
									<form action="?/undoReview" method="POST">
										<input type="hidden" name="shipId" value={shipInfo.ship.id} />
										<button class="btn btn-ghost btn-xs" type="submit">Undo</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
					{#if filteredReviewedShips.length === 0}
						<tr
							><td colspan="7" class="text-base-content/40 py-6 text-center">No reviewed ships</td
							></tr
						>
					{/if}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Deleted Ships -->
	<section>
		<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
			Deleted Ships ({filteredDeletedShips.length})
		</h2>
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
			<table class="table-sm table-zebra table opacity-75">
				<thead>
					<tr>
						<th>Project</th>
						<th>User</th>
						<th>Title</th>
						<th>Status</th>
						<th>Hackatime</th>
						<th>Time</th>
						<th>Feedback</th>
						<th>Deleted</th>
						<th>Deleted By</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredDeletedShips as shipInfo}
						<tr>
							<td class="font-mono text-xs">{shipInfo.ship.projectId}</td>
							<td>{shipInfo.username}</td>
							<td>{shipInfo.project?.title ?? 'Metadata unavailable'}</td>
							<td><span class="badge badge-ghost badge-sm">Deleted</span></td>
							<td>
								{#if shipInfo.project?.hackatimeProjects.length}
									<div class="max-w-48 text-xs">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-base-content/30">—</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td class="max-w-xs truncate text-xs">{shipInfo.ship.feedback ?? '—'}</td>
							<td class="text-xs">{new Date(shipInfo.ship.deletedAt).toLocaleString()}</td>
							<td>{shipInfo.deletedByUsername}</td>
						</tr>
					{/each}
					{#if filteredDeletedShips.length === 0}
						<tr
							><td colspan="9" class="text-base-content/40 py-6 text-center">No deleted ships</td
							></tr
						>
					{/if}
				</tbody>
			</table>
		</div>
	</section>
</div>
