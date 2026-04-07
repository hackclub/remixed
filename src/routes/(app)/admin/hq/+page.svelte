<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { formatHours, NOTES_PER_HOUR, MIN_NOTES_PER_HOUR, MAX_NOTES_PER_HOUR, NOTE_VALUE_USD } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';

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

<!-- HQ Approve popover -->
<div bind:this={approvePopover} class="{styleAdminPopover} font-jua" popover id="hq-approve">
	<form action="?/hqApprove" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={activeShipId} />
		<p class="text-lg">Ship time: {formatHours(activeShipSeconds)}</p>
		<label class="block">
			<span class="text-sm">Final Approved Hours</span>
			<input
				type="number"
				name="adjustedHours"
				step="0.1"
				min="0.1"
				max={(activeShipSeconds / 3600).toFixed(1)}
				bind:value={adjustedHours}
				class="{styleInput} w-full font-jua text-text"
			/>
		</label>
		<label class="block">
			<span class="text-sm">Notes per Hour — ${hourlyRate}/hr</span>
			<div class="flex items-center gap-3">
				<input
					type="range"
					name="notesPerHour"
					min={MIN_NOTES_PER_HOUR}
					max={MAX_NOTES_PER_HOUR}
					step="1"
					bind:value={notesPerHour}
					class="flex-1"
				/>
				<input
					type="number"
					min={MIN_NOTES_PER_HOUR}
					max={MAX_NOTES_PER_HOUR}
					step="1"
					bind:value={notesPerHour}
					class="{styleInput} w-20 font-jua text-text"
				/>
			</div>
		</label>
		{#if notesPerHour * NOTE_VALUE_USD > 5}
			<p class="text-sm font-bold text-black">
				This goes over the regular program payout amount! If in doubt - ask in the channel!
			</p>
		{/if}
		<p class="text-sm">
			Payout: {notesPayout} notes ({adjustedHours}h x {notesPerHour} notes/h)
		</p>
		<label class="block">
			<span class="text-sm">Comment for shipper (required)</span>
			<textarea
				required
				name="userComment"
				bind:value={userComment}
				class="{styleInput} w-full font-jua text-text"
				placeholder="Visible to the shipper"
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal comment / Hours justification (required)</span>
			<textarea
				required
				name="internalComment"
				bind:value={internalComment}
				class="{styleInput} w-full font-jua text-text"
				placeholder="Used as Airtable hours justification"
			></textarea>
		</label>
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => approvePopover?.hidePopover()}>Cancel</button
			>
			<button
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
			>Final Approve</button>
		</div>
	</form>
</div>

<!-- HQ Reject popover -->
<div bind:this={rejectPopover} class="{styleAdminPopover} font-jua" popover id="hq-reject">
	<form action="?/hqReject" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={activeShipId} />
		<label class="block">
			<span class="text-sm">Internal comment (required, shipper NOT notified)</span>
			<textarea
				required
				name="internalComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Why is this being sent back to review?"
			></textarea>
		</label>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => rejectPopover?.hidePopover()}>Cancel</button
			>
			<button
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
			>Return to Queue</button>
		</div>
	</form>
</div>

<!-- Backfill Airtable popover -->
<div bind:this={backfillPopover} class="{styleAdminPopover} font-jua" popover id="backfill-airtable">
	<form action="?/backfillAirtable" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={backfillShipId} />
		<p class="text-lg">Send legacy ship #{backfillShipId} to Airtable</p>
		<label class="block">
			<span class="text-sm">Hours justification (required)</span>
			<textarea
				required
				name="justification"
				bind:value={backfillJustification}
				class="{styleInput} w-full font-jua text-text"
				placeholder="e.g. Legacy approval, backfilled to Airtable"
			></textarea>
		</label>
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => backfillPopover?.hidePopover()}>Cancel</button
			>
			<button
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
			>Send to Airtable</button>
		</div>
	</form>
</div>

<!-- Revoke Legacy Ship popover -->
<div bind:this={revokePopover} class="{styleAdminPopover} font-jua" popover id="revoke-legacy">
	<form action="?/revokeLegacyShip" method="POST" class="space-y-4">
		<input type="hidden" name="shipId" value={revokeShipId} />
		<p class="text-lg text-red-400">Revoke legacy ship #{revokeShipId}</p>
		<p class="text-sm">
			This will cancel the ship, deduct awarded notes, cancel pending orders if the balance
			goes negative, and notify the user via Slack.
		</p>
		<label class="block">
			<span class="text-sm">Reason (required, sent to user)</span>
			<textarea
				required
				name="reason"
				bind:value={revokeReason}
				class="{styleInput} w-full font-jua text-text"
				placeholder="Why is this ship being revoked?"
			></textarea>
		</label>
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => revokePopover?.hidePopover()}>Cancel</button
			>
			<button
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-red-400"
			>Revoke</button>
		</div>
	</form>
</div>

<div class="p-10 pb-40 font-jua text-text">
	<p class="mb-6 text-2xl">HQ Review Queue ({data.ships.length})</p>
	{#if data.ships.length === 0}
		<p class="text-text/60">No ships awaiting HQ approval.</p>
	{:else}
		<table class="admin-table w-full bg-accent-purple">
			<thead class="font-jua text-text">
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
			<tbody class="font-jua text-text">
				{#each data.ships as shipInfo}
					<tr>
						<td>
							<a href="/admin/ships/{shipInfo.project.id}" class="underline">
								#{shipInfo.ship.id}
							</a>
						</td>
						<td>
							<a href="/user/{shipInfo.user.id}" class="underline">
								{shipInfo.user.username}
							</a>
						</td>
						<td>
							<a href="/projects/{shipInfo.project.id}" class="underline">
								{shipInfo.project.title}
							</a>
						</td>
						<td>
							{#if shipInfo.project.githubUrl}
								<a
									href={shipInfo.project.githubUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="underline">GitHub</a
								>
							{:else}
								<span class="text-text/50">None</span>
							{/if}
						</td>
						<td>
							{#if shipInfo.project.demoUrl}
								<a
									href={shipInfo.project.demoUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="underline">Demo</a
								>
							{:else}
								<span class="text-text/50">None</span>
							{/if}
						</td>
						<td>{formatHours(shipInfo.ship.seconds)}</td>
						<td>{shipInfo.approval?.reviewer.username ?? 'N/A'}</td>
						<td>
							{shipInfo.approval?.review.adjustedHours ?? 'N/A'}h
							{#if shipInfo.approval?.review.adjustedHours != null}
								{@const rate = shipInfo.approval?.review.notesPerHour ?? NOTES_PER_HOUR}
								<span class="text-xs text-text/50">@ ${(rate * NOTE_VALUE_USD).toFixed(2)}/hr</span>
							{/if}
						</td>
						<td class="max-w-xs truncate">
							{shipInfo.approval?.review.internalComment ?? 'None'}
						</td>
						<td>
							<div class="flex flex-wrap gap-2">
								<button
									class="{styleButton} bg-text px-4 py-1 text-lg text-light"
									onclick={() => openApprove(shipInfo)}
									popovertarget="hq-approve">Approve</button
								>
								<button
									class="{styleButton} bg-text px-4 py-1 text-lg text-light"
									onclick={() => (activeShipId = String(shipInfo.ship.id))}
									popovertarget="hq-reject">Return</button
								>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<!-- Screenshot backfill -->
	<div class="mt-10">
		<p class="mb-2 text-2xl">Backfill Screenshots to R2</p>
		<p class="mb-4 text-sm text-text/60">
			Uploads all project screenshots that are still stored as raw external URLs to our R2 bucket.
			Run once after enabling R2 storage.
		</p>
		<form action="?/backfillScreenshots" method="POST">
			<button type="submit" class="{styleButton} bg-text px-6 py-2 text-lg text-light">
				Run Screenshot Backfill
			</button>
		</form>
		{#if form && 'backfillResult' in form && form.backfillResult}
			{@const r = form.backfillResult}
			<div class="mt-4 rounded-xl border border-text/20 bg-accent-purple/20 p-4 text-sm font-jua">
				<p>Total to migrate: {r.total}</p>
				<p class="text-green-400">Succeeded: {r.succeeded}</p>
				{#if r.failed > 0}
					<p class="text-red-400">Failed: {r.failed}</p>
					{#each r.errors as err}
						<p class="text-red-300 text-xs">{err}</p>
					{/each}
				{/if}
			</div>
		{/if}
	</div>

	{#if data.legacyApprovedShips.length > 0}
		<div class="mt-10">
			<p class="mb-3 text-2xl">Legacy Approved Ships ({data.legacyApprovedShips.length})</p>
			<p class="mb-4 text-sm text-text/60">
				Approved ships that can be synced (or re-synced) to Airtable. Use re-sync if a previous sync failed.
			</p>
			<form action="?/backfillAirtable" method="POST" class="mb-4">
				<table class="admin-table w-full bg-accent-purple/80">
					<thead class="font-jua text-text">
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
					<tbody class="font-jua text-text">
						{#each data.legacyApprovedShips as shipInfo}
							<tr>
								<td>#{shipInfo.ship.id}</td>
								<td>
									<a href="/user/{shipInfo.user.id}" class="underline">
										{shipInfo.user.username}
									</a>
								</td>
								<td>
									<a href="/projects/{shipInfo.project.id}" class="underline">
										{shipInfo.project.title}
									</a>
								</td>
								<td>
									{#if shipInfo.project.githubUrl}
										<a
											href={shipInfo.project.githubUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline">GitHub</a
										>
									{:else}
										<span class="text-text/50">None</span>
									{/if}
								</td>
								<td>
									{#if shipInfo.project.demoUrl}
										<a
											href={shipInfo.project.demoUrl}
											target="_blank"
											rel="noopener noreferrer"
											class="underline">Demo</a
										>
									{:else}
										<span class="text-text/50">None</span>
									{/if}
								</td>
								<td>{formatHours(shipInfo.ship.seconds)}</td>
								<td>
									{#if shipInfo.airtableSynced}
										<span class="text-green-400">Yes</span>
									{:else}
										<span class="text-text/50">No</span>
									{/if}
								</td>
								<td>
									<div class="flex flex-wrap gap-2">
										<button
											class="{styleButton} bg-text px-4 py-1 text-lg text-light"
											type="button"
											onclick={() => {
												backfillShipId = String(shipInfo.ship.id);
												backfillJustification = shipInfo.airtableSynced
													? 'Re-sync to Airtable (previous sync may have failed)'
													: 'Legacy approval, backfilled to Airtable';
											}}
											popovertarget="backfill-airtable"
										>{shipInfo.airtableSynced ? 'Re-sync' : 'Backfill'}</button>
										<button
											class="{styleButton} bg-text px-4 py-1 text-lg text-red-400"
											type="button"
											onclick={() => {
												revokeShipId = String(shipInfo.ship.id);
												revokeReason = '';
											}}
											popovertarget="revoke-legacy"
										>Revoke</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</form>
		</div>
	{/if}
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
