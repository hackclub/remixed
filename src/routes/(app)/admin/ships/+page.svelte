<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';

	let { data }: { data: PageData } = $props();
	const payoutMults = $derived(data.payoutMults);
	const isOrg = $derived(data.roles?.includes('ORGANIZER') ?? false);
	type ShipRow = PageData['pendingShips'][number];

	const hourMult = 60 * 60;

	let currentSeconds = $state(0);
	let notesMult = $state(0);
	let notesPayout = $derived(Math.ceil((currentSeconds * notesMult) / hourMult));
	let activeShipId = $state('');
	let activeUserId = $state('');
	let orgMultMode = $state(false);
	let projectSearch = $state('');
	let approvePopover: HTMLElement | undefined = $state();
	let rejectPopover: HTMLElement | undefined = $state();

	function matchesQuery(shipInfo: ShipRow, query: string) {
		return [
			String(shipInfo.ship.projectId),
			String(shipInfo.ship.id),
			shipInfo.user.username,
			shipInfo.user.slackId,
			shipInfo.project.title,
			shipInfo.project.category,
			shipInfo.project.githubUrl ?? '',
			shipInfo.project.demoUrl ?? '',
			shipInfo.project.hackatimeProjects.join(' '),
			shipInfo.ship.status,
			shipInfo.ship.feedback ?? '',
		].some((value) => value.toLowerCase().includes(query));
	}

	let filteredPendingShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.pendingShips;

		return data.pendingShips.filter((shipInfo) => matchesQuery(shipInfo, query));
	});

	let filteredReviewedShips = $derived.by(() => {
		const query = projectSearch.trim().toLowerCase();
		if (!query) return data.reviewedShips;

		return data.reviewedShips.filter((shipInfo) => matchesQuery(shipInfo, query));
	});

	$effect(() => {
		if (!notesMult) {
			notesMult = payoutMults.reviewer[0];
		}
	});
</script>

<div bind:this={approvePopover} class={styleAdminPopover} popover id="confirm-approve">
	<form action="?/approve" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={activeShipId} />
		<input type="hidden" name="userId" value={activeUserId} />
		<input type="hidden" name="shipSeconds" value={currentSeconds} />
		<div class="flex justify-between font-jua">
			<span>{formatHours(currentSeconds)}</span>
			<span>x</span>
			<span>{notesMult}</span>
			<span>=</span>
			<span>{notesPayout}</span>
		</div>
		<input
			type="range"
			name="payoutMult"
			class="w-full"
			step="0.2"
			bind:value={notesMult}
			min={orgMultMode ? payoutMults.organizer[0] : payoutMults.reviewer[0]}
			max={orgMultMode ? payoutMults.organizer[1] : payoutMults.reviewer[1]}
		/>
		{#if isOrg}
			<label class="block cursor-pointer font-jua">
				<input type="checkbox" bind:checked={orgMultMode} />
				Organizer Payout
			</label>
		{/if}
		<textarea
			required
			name="feedback"
			class="{styleInput} w-full font-jua text-text"
			placeholder="Feedback"
		></textarea>
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => approvePopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Confirm"
			/>
		</div>
	</form>
</div>

<div bind:this={rejectPopover} class={styleAdminPopover} popover id="confirm-reject">
	<form action="?/reject" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={activeShipId} />
		<textarea
			required
			name="feedback"
			class="{styleInput} w-full font-jua text-text"
			placeholder="Feedback"
		></textarea>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => rejectPopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Confirm"
			/>
		</div>
	</form>
</div>

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
		<div>
			<p class="mb-3 text-2xl">Pending Reviews</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>Project</th>
						<th>User</th>
						<th>Title</th>
						<th>Category</th>
						<th>Hackatime</th>
						<th>Joe</th>
						<th>GitHub</th>
						<th>Demo</th>
						<th>Time</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each filteredPendingShips as shipInfo}
						<tr>
							<td>{shipInfo.ship.projectId}</td>
							<td>
								<a href="/user/{shipInfo.user.id}">
									{shipInfo.user.username}
								</a>
							</td>
							<td>
								<a href="/projects/{shipInfo.project.id}">
									{shipInfo.project.title}
								</a>
							</td>
							<td>{shipInfo.project.category}</td>
							<td>
								{#if shipInfo.project.hackatimeProjects.length}
									<div class="max-w-52 text-sm">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-text/60">None</span>
								{/if}
							</td>
							<td>
								<a
									href="https://joe.fraud.hackclub.com/billy/overview?u={shipInfo.user.username}"
									target="_blank"
									rel="noopener noreferrer"
								>
									Joe Stats
								</a>
							</td>
							<td>
								<a href={shipInfo.project.githubUrl} target="_blank" rel="noopener noreferrer">
									Github
								</a>
							</td>
							<td>
								<a href={shipInfo.project.demoUrl} target="_blank" rel="noopener noreferrer">
									Demo
								</a>
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td>
								<div class="flex flex-wrap gap-2">
									<button
										class="{styleButton} bg-text px-4 py-1 text-lg text-light"
										onclick={() => {
											activeUserId = String(shipInfo.user.id);
											activeShipId = String(shipInfo.ship.id);
											currentSeconds = shipInfo.ship.seconds;
										}}
										popovertarget="confirm-approve">Approve</button
									>
									<button
										class="{styleButton} bg-text px-4 py-1 text-lg text-light"
										popovertarget="confirm-reject"
										onclick={() => (activeShipId = String(shipInfo.ship.id))}>Reject</button
									>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div>
			<p class="mb-3 text-2xl">Reviewed Ships</p>
			<table class="admin-table w-full bg-accent-purple">
				<thead class="font-jua text-text">
					<tr>
						<th>Project</th>
						<th>User</th>
						<th>Title</th>
						<th>Status</th>
						<th>Hackatime</th>
						<th>Joe</th>
						<th>Time</th>
						<th>Feedback</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody class="font-jua text-text">
					{#each filteredReviewedShips as shipInfo}
						<tr>
							<td>{shipInfo.ship.projectId}</td>
							<td>
								<a href="/user/{shipInfo.user.id}">
									{shipInfo.user.username}
								</a>
							</td>
							<td>
								<a href="/projects/{shipInfo.project.id}">
									{shipInfo.project.title}
								</a>
							</td>
							<td>
								<span
									class:text-accent-red={shipInfo.ship.status === 'REJECTED'}
									class:text-green-700={shipInfo.ship.status === 'APPROVED'}
								>
									{shipInfo.ship.status}
								</span>
							</td>
							<td>
								{#if shipInfo.project.hackatimeProjects.length}
									<div class="max-w-52 text-sm">
										{shipInfo.project.hackatimeProjects.join(', ')}
									</div>
								{:else}
									<span class="text-text/60">None</span>
								{/if}
							</td>
							<td>
								<a
									href="https://joe.fraud.hackclub.com/billy/overview?u={shipInfo.user.username}"
									target="_blank"
									rel="noopener noreferrer"
								>
									Joe Stats
								</a>
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td>{shipInfo.ship.feedback ?? 'None'}</td>
							<td>
								<form action="?/undoReview" method="POST">
									<input type="hidden" name="shipId" value={shipInfo.ship.id} />
									<button class="{styleButton} bg-text px-4 py-1 text-lg text-light" type="submit">
										Undo review
									</button>
								</form>
							</td>
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
</style>
