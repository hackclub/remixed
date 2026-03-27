<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours, formatProjectCategory } from '$lib';
	import { styleButton, styleInput } from '$lib/styles.js';

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

<div class="p-10 pb-40 font-jua text-text">
	<div class="mb-6">
		<input
			type="search"
			bind:value={projectSearch}
			class="{styleInput} w-full max-w-xl border-2 border-text font-jua text-lg"
			placeholder="Search projects, users, Hackatime IDs, reviews, or links"
		/>
	</div>
	<div class="space-y-10">
		<!-- Pending Reviews -->
		<div>
			<p class="mb-3 text-2xl">Pending Reviews ({filteredPendingShips.length})</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>Ship</th>
						<th>User</th>
						<th>Title</th>
						<th>Category</th>
						<th>Hackatime</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each filteredPendingShips as shipInfo}
						<tr
							class="clickable-row"
							onclick={() => window.open(`/admin/ships/${shipInfo.ship.id}`, '_blank')}
						>
							<td>#{shipInfo.ship.id}</td>
							<td>{shipInfo.user.username}</td>
							<td>{shipInfo.project.title}</td>
							<td>{formatProjectCategory(shipInfo.project.category)}</td>
							<td>
								{#if shipInfo.project.hackatimeProjects.length}
									<div class="max-w-52 text-sm">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-text/60">None</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Awaiting HQ Approval -->
		{#if filteredReviewerApprovedShips.length > 0}
			<div>
				<p class="mb-3 text-2xl">Awaiting HQ Approval ({filteredReviewerApprovedShips.length})</p>
				<table class="admin-table w-full bg-accent-purple/80">
					<thead class="font-jua text-text">
						<tr>
							<th>Ship</th>
							<th>User</th>
							<th>Title</th>
							<th>Time</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody class="font-jua text-text">
						{#each filteredReviewerApprovedShips as shipInfo}
							<tr
								class="clickable-row"
								onclick={() => window.open(`/admin/ships/${shipInfo.ship.id}`, '_blank')}
							>
								<td>#{shipInfo.ship.id}</td>
								<td>{shipInfo.user.username}</td>
								<td>{shipInfo.project.title}</td>
								<td>{formatHours(shipInfo.ship.seconds)}</td>
								<td><span class="text-yellow-700">AWAITING HQ</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Reviewed Ships -->
		<div>
			<p class="mb-3 text-2xl">Reviewed Ships</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>Ship</th>
						<th>User</th>
						<th>Title</th>
						<th>Status</th>
						<th>Time</th>
						<th>Feedback</th>
						{#if isOrg}
							<th>Actions</th>
						{/if}
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each filteredReviewedShips as shipInfo}
						<tr
							class="clickable-row"
							onclick={(e) => {
								if ((e.target as HTMLElement).closest('form, button')) return;
								window.open(`/admin/ships/${shipInfo.ship.id}`, '_blank');
							}}
						>
							<td>#{shipInfo.ship.id}</td>
							<td>{shipInfo.user.username}</td>
							<td>{shipInfo.project.title}</td>
							<td>
								<span
									class:text-accent-red={shipInfo.ship.status === 'REJECTED'}
									class:text-green-700={shipInfo.ship.status === 'APPROVED'}
								>
									{shipInfo.ship.status}
								</span>
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td>{shipInfo.ship.feedback ?? 'None'}</td>
							{#if isOrg}
								<td>
									<form action="?/undoReview" method="POST">
										<input type="hidden" name="shipId" value={shipInfo.ship.id} />
										<button class="{styleButton} bg-text px-4 py-1 text-lg text-light" type="submit">
											Undo
										</button>
									</form>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Deleted Ships -->
		<div>
			<p class="mb-3 text-2xl">Deleted Ships</p>
			<table class="admin-table w-full bg-accent-purple/70">
				<thead class="font-jua text-text">
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
				<tbody class="font-jua text-text">
					{#each filteredDeletedShips as shipInfo}
						<tr class="opacity-80">
							<td>{shipInfo.ship.projectId}</td>
							<td>{shipInfo.username}</td>
							<td>{shipInfo.project?.title ?? 'Deleted project metadata unavailable'}</td>
							<td>
								<span class="text-accent-red">DELETED</span>
								<span class="ml-2 text-text/70">({shipInfo.ship.status})</span>
							</td>
							<td>
								{#if shipInfo.project?.hackatimeProjects.length}
									<div class="max-w-52 text-sm">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-text/60">None</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td>{shipInfo.ship.feedback ?? 'None'}</td>
							<td>{new Date(shipInfo.ship.deletedAt).toLocaleString()}</td>
							<td>{shipInfo.deletedByUsername}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
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
	.clickable-row {
		cursor: pointer;
	}
	.clickable-row:hover {
		background-color: rgba(0, 0, 0, 0.05);
	}
</style>
