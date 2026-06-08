<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import {
		formatHours,
		NOTES_PER_HOUR,
		MIN_NOTES_PER_HOUR,
		MAX_NOTES_PER_HOUR,
		NOTE_VALUE_USD,
	} from '$lib';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeShipId = $state('');
	let activeShipSeconds = $state(0);
	let adjustedHours = $state(0);
	let notesPerHour = $state(NOTES_PER_HOUR);
	let notesPayout = $derived(Math.ceil(adjustedHours * notesPerHour));
	let hourlyRate = $derived((notesPerHour * NOTE_VALUE_USD).toFixed(2));
	let userComment = $state('');
	let internalComment = $state('');

	let backfillJustification = $state('');
	let backfillShipId = $state('');
	let revokeShipId = $state('');
	let revokeReason = $state('');

	let approvePopover: HTMLElement | undefined = $state();
	let rejectPopover: HTMLElement | undefined = $state();
	let backfillPopover: HTMLElement | undefined = $state();
	let revokePopover: HTMLElement | undefined = $state();

	type ShipRow = (typeof data.ships)[number];

	function openApprove(shipInfo: ShipRow) {
		activeShipId = String(shipInfo.ship.id);
		activeShipSeconds = shipInfo.ship.seconds;
		adjustedHours =
			shipInfo.approval?.review.adjustedHours ??
			parseFloat((shipInfo.ship.seconds / 3600).toFixed(1));
		notesPerHour = shipInfo.approval?.review.notesPerHour ?? NOTES_PER_HOUR;
		userComment = shipInfo.approval?.review.userComment ?? '';
		internalComment = shipInfo.approval?.review.internalComment ?? '';
	}
</script>

<svelte:head><title>HQ Review — Admin</title></svelte:head>

<!-- HQ Approve popover -->
<div
	bind:this={approvePopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="hq-approve"
>
	<div class="border-base-300 border-b px-5 py-4">
		<h3 class="text-sm font-semibold">Final Approve</h3>
	</div>
	<div class="p-5">
		<form action="?/hqApprove" method="POST" class="space-y-3">
			<input type="hidden" name="shipId" value={activeShipId} />
			<p class="text-base-content/60 text-sm">Ship time: {formatHours(activeShipSeconds)}</p>
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal">Final Approved Hours</legend>
				<input
					type="number"
					name="adjustedHours"
					step="0.1"
					min="0.1"
					max={(activeShipSeconds / 3600).toFixed(1)}
					bind:value={adjustedHours}
					class="input input-bordered input-sm w-full"
				/>
			</fieldset>
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal"
					>Notes per Hour — ${hourlyRate}/hr</legend
				>
				<div class="flex items-center gap-3">
					<input
						type="range"
						name="notesPerHour"
						min={MIN_NOTES_PER_HOUR}
						max={MAX_NOTES_PER_HOUR}
						step="1"
						bind:value={notesPerHour}
						class="range range-sm flex-1"
					/>
					<input
						type="number"
						min={MIN_NOTES_PER_HOUR}
						max={MAX_NOTES_PER_HOUR}
						step="1"
						bind:value={notesPerHour}
						class="input input-bordered input-sm w-20"
					/>
				</div>
			</fieldset>
			{#if notesPerHour * NOTE_VALUE_USD > 5}
				<div class="alert alert-warning text-xs">
					This goes over the regular program payout amount! If in doubt — ask in the channel!
				</div>
			{/if}
			<p class="text-base-content/50 text-xs">
				Payout: {notesPayout} notes ({adjustedHours}h x {notesPerHour} notes/h)
			</p>
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal">Comment for shipper (required)</legend>
				<textarea
					required
					name="userComment"
					bind:value={userComment}
					class="textarea textarea-bordered textarea-sm w-full"
					placeholder="Visible to the shipper"
				></textarea>
			</fieldset>
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal"
					>Internal comment / Hours justification (required)</legend
				>
				<textarea
					required
					name="internalComment"
					bind:value={internalComment}
					class="textarea textarea-bordered textarea-sm w-full"
					placeholder="Used as Airtable hours justification"
				></textarea>
			</fieldset>
			<div class="flex gap-2 pt-1">
				<button
					type="button"
					class="btn btn-sm btn-outline flex-1"
					onclick={() => approvePopover?.hidePopover()}>Cancel</button
				>
				<button type="submit" class="btn btn-sm btn-success flex-1">Final Approve</button>
			</div>
		</form>
	</div>
</div>

<!-- HQ Reject popover -->
<div
	bind:this={rejectPopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="hq-reject"
>
	<div class="border-base-300 border-b px-5 py-4">
		<h3 class="text-sm font-semibold">Return to Queue</h3>
	</div>
	<div class="p-5">
		<form action="?/hqReject" method="POST" class="space-y-3">
			<input type="hidden" name="shipId" value={activeShipId} />
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal"
					>Internal comment (required, shipper NOT notified)</legend
				>
				<textarea
					required
					name="internalComment"
					class="textarea textarea-bordered textarea-sm w-full"
					placeholder="Why is this being sent back to review?"
				></textarea>
			</fieldset>
			<div class="flex gap-2 pt-1">
				<button
					type="button"
					class="btn btn-sm btn-outline flex-1"
					onclick={() => rejectPopover?.hidePopover()}>Cancel</button
				>
				<button type="submit" class="btn btn-sm btn-warning flex-1">Return to Queue</button>
			</div>
		</form>
	</div>
</div>

<!-- Backfill Airtable popover -->
<div
	bind:this={backfillPopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="backfill-airtable"
>
	<div class="border-base-300 border-b px-5 py-4">
		<h3 class="text-sm font-semibold">Backfill to Airtable</h3>
		<p class="text-base-content/50 mt-0.5 text-xs">Ship #{backfillShipId}</p>
	</div>
	<div class="p-5">
		<form action="?/backfillAirtable" method="POST" class="space-y-3">
			<input type="hidden" name="shipId" value={backfillShipId} />
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal">Hours justification (required)</legend>
				<textarea
					required
					name="justification"
					bind:value={backfillJustification}
					class="textarea textarea-bordered textarea-sm w-full"
					placeholder="e.g. Legacy approval, backfilled to Airtable"
				></textarea>
			</fieldset>
			<div class="flex gap-2 pt-1">
				<button
					type="button"
					class="btn btn-sm btn-outline flex-1"
					onclick={() => backfillPopover?.hidePopover()}>Cancel</button
				>
				<button type="submit" class="btn btn-sm btn-primary flex-1">Send to Airtable</button>
			</div>
		</form>
	</div>
</div>

<!-- Revoke Legacy Ship popover -->
<div
	bind:this={revokePopover}
	class="bg-base-200 border-base-300 w-[min(90vw,36rem)] rounded-xl border shadow-2xl"
	popover
	id="revoke-legacy"
>
	<div class="border-base-300 border-b px-5 py-4">
		<h3 class="text-error text-sm font-semibold">Revoke Legacy Ship</h3>
		<p class="text-base-content/50 mt-0.5 text-xs">Ship #{revokeShipId}</p>
	</div>
	<div class="p-5">
		<p class="text-base-content/60 mb-4 text-xs">
			This will cancel the ship, deduct awarded notes, cancel pending orders if the balance goes
			negative, and notify the user via Slack.
		</p>
		<form action="?/revokeLegacyShip" method="POST" class="space-y-3">
			<input type="hidden" name="shipId" value={revokeShipId} />
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend text-xs font-normal">Reason (required, sent to user)</legend>
				<textarea
					required
					name="reason"
					bind:value={revokeReason}
					class="textarea textarea-bordered textarea-sm w-full"
					placeholder="Why is this ship being revoked?"
				></textarea>
			</fieldset>
			<div class="flex gap-2 pt-1">
				<button
					type="button"
					class="btn btn-sm btn-outline flex-1"
					onclick={() => revokePopover?.hidePopover()}>Cancel</button
				>
				<button type="submit" class="btn btn-sm btn-error flex-1">Revoke</button>
			</div>
		</form>
	</div>
</div>

<div class="space-y-8">
	<h1 class="text-xl font-bold">HQ Review Queue ({data.ships.length})</h1>

	{#if data.ships.length === 0}
		<div class="card bg-base-100 border-base-300 border">
			<div class="card-body text-base-content/40 py-10 text-center">
				No ships awaiting HQ approval.
			</div>
		</div>
	{:else}
		<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
			<table class="table-sm table-zebra table">
				<thead>
					<tr>
						<th>Ship</th>
						<th>User</th>
						<th>Title</th>
						<th>GitHub</th>
						<th>Demo</th>
						<th>Time</th>
						<th>Reviewer</th>
						<th>Adj. Hours</th>
						<th>Reviewer Notes</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.ships as shipInfo}
						<tr>
							<td>
								<a
									href="/admin/ships/{shipInfo.project.id}"
									class="link link-hover font-mono text-xs"
								>
									#{shipInfo.ship.id}
								</a>
							</td>
							<td>
								<div class="flex items-center gap-2">
									<img
										src={shipInfo.user.avatarUrl ?? '/404.jpg'}
										alt={shipInfo.user.username}
										class="h-6 w-6 shrink-0 rounded-full object-cover"
									/>
									<a href="/user/{shipInfo.user.id}" class="link link-hover">
										{shipInfo.user.username}
									</a>
								</div>
							</td>
							<td>
								<a href="/projects/{shipInfo.project.id}" class="link link-hover">
									{shipInfo.project.title}
								</a>
							</td>
							<td>
								{#if shipInfo.project.githubUrl}
									<a
										href={shipInfo.project.githubUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="link link-hover text-xs">GitHub ↗</a
									>
								{:else}
									<span class="text-base-content/30">—</span>
								{/if}
							</td>
							<td>
								{#if shipInfo.project.demoUrl}
									<a
										href={shipInfo.project.demoUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="link link-hover text-xs">Demo ↗</a
									>
								{:else}
									<span class="text-base-content/30">—</span>
								{/if}
							</td>
							<td>{formatHours(shipInfo.ship.seconds)}</td>
							<td>{shipInfo.approval?.reviewer.username ?? '—'}</td>
							<td>
								{shipInfo.approval?.review.adjustedHours ?? '—'}{shipInfo.approval?.review
									.adjustedHours != null
									? 'h'
									: ''}
								{#if shipInfo.approval?.review.adjustedHours != null}
									{@const rate = shipInfo.approval?.review.notesPerHour ?? NOTES_PER_HOUR}
									<span class="text-base-content/50 text-xs"
										>@ ${(rate * NOTE_VALUE_USD).toFixed(2)}/hr</span
									>
								{/if}
							</td>
							<td class="max-w-xs">
								<div class="text-base-content/70 truncate text-xs">
									{shipInfo.approval?.review.internalComment ?? '—'}
								</div>
							</td>
							<td>
								<div class="flex flex-wrap gap-1">
									<button
										class="btn btn-xs btn-success"
										onclick={() => openApprove(shipInfo)}
										popovertarget="hq-approve">Approve</button
									>
									<button
										class="btn btn-xs btn-warning"
										onclick={() => (activeShipId = String(shipInfo.ship.id))}
										popovertarget="hq-reject">Return</button
									>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Screenshot backfill -->
	<div class="card bg-base-100 border-base-300 border">
		<div class="card-body p-5">
			<h2 class="mb-1 text-sm font-semibold">Backfill Screenshots to R2</h2>
			<p class="text-base-content/60 mb-4 text-xs">
				Uploads all project screenshots still stored as raw external URLs to our R2 bucket. Run once
				after enabling R2 storage.
			</p>
			<form action="?/backfillScreenshots" method="POST">
				<button type="submit" class="btn btn-sm btn-outline">Run Screenshot Backfill</button>
			</form>
			{#if form && 'backfillResult' in form && form.backfillResult}
				{@const r = form.backfillResult}
				<div class="mt-4 space-y-1 text-sm">
					<p>Total to migrate: {r.total}</p>
					<p class="text-success">Succeeded: {r.succeeded}</p>
					{#if r.failed > 0}
						<p class="text-error">Failed: {r.failed}</p>
						{#each r.errors as err}
							<p class="text-error text-xs">{err}</p>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Legacy Approved Ships -->
	{#if data.legacyApprovedShips.length > 0}
		<section>
			<h2 class="text-base-content/70 mb-2 text-sm font-semibold tracking-wide uppercase">
				Legacy Approved Ships ({data.legacyApprovedShips.length})
			</h2>
			<p class="text-base-content/50 mb-3 text-xs">
				Approved ships that can be synced (or re-synced) to Airtable.
			</p>
			<div class="rounded-box border-base-300 bg-base-100 overflow-x-auto border">
				<table class="table-sm table-zebra table">
					<thead>
						<tr>
							<th>Ship</th>
							<th>User</th>
							<th>Title</th>
							<th>GitHub</th>
							<th>Demo</th>
							<th>Time</th>
							<th>Synced</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.legacyApprovedShips as shipInfo}
							<tr>
								<td class="font-mono text-xs">#{shipInfo.ship.id}</td>
								<td>
									<div class="flex items-center gap-2">
										<img
											src={shipInfo.user.avatarUrl ?? '/404.jpg'}
											alt={shipInfo.user.username}
											class="h-6 w-6 shrink-0 rounded-full object-cover"
										/>
										<a href="/user/{shipInfo.user.id}" class="link link-hover">
											{shipInfo.user.username}
										</a>
									</div>
								</td>
								<td>
									<a href="/projects/{shipInfo.project.id}" class="link link-hover">
										{shipInfo.project.title}
									</a>
								</td>
								<td>
									{#if shipInfo.project.githubUrl}
										<a
											href={shipInfo.project.githubUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="link link-hover text-xs">GitHub ↗</a
										>
									{:else}
										<span class="text-base-content/30">—</span>
									{/if}
								</td>
								<td>
									{#if shipInfo.project.demoUrl}
										<a
											href={shipInfo.project.demoUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="link link-hover text-xs">Demo ↗</a
										>
									{:else}
										<span class="text-base-content/30">—</span>
									{/if}
								</td>
								<td>{formatHours(shipInfo.ship.seconds)}</td>
								<td>
									{#if shipInfo.airtableSynced}
										<span class="badge badge-success badge-sm">Yes</span>
									{:else}
										<span class="badge badge-ghost badge-sm">No</span>
									{/if}
								</td>
								<td>
									<div class="flex gap-1">
										<button
											class="btn btn-xs btn-outline"
											type="button"
											onclick={() => {
												backfillShipId = String(shipInfo.ship.id);
												backfillJustification = shipInfo.airtableSynced
													? 'Re-sync to Airtable (previous sync may have failed)'
													: 'Legacy approval, backfilled to Airtable';
											}}
											popovertarget="backfill-airtable"
											>{shipInfo.airtableSynced ? 'Re-sync' : 'Backfill'}</button
										>
										<button
											class="btn btn-xs btn-error btn-outline"
											type="button"
											onclick={() => {
												revokeShipId = String(shipInfo.ship.id);
												revokeReason = '';
											}}
											popovertarget="revoke-legacy">Revoke</button
										>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>
