<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours, NOTES_PER_HOUR } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';

	let { data }: { data: PageData } = $props();

	let activeShipId = $state('');
	let activeShipSeconds = $state(0);
	let adjustedHours = $state(0);
	let notesPayout = $derived(Math.ceil(adjustedHours * NOTES_PER_HOUR));

	let approvePopover: HTMLElement | undefined = $state();
	let rejectPopover: HTMLElement | undefined = $state();

	type ShipRow = (typeof data.ships)[number];

	function openApprove(shipInfo: ShipRow) {
		activeShipId = String(shipInfo.ship.id);
		activeShipSeconds = shipInfo.ship.seconds;
		adjustedHours =
			shipInfo.approval?.review.adjustedHours ??
			parseFloat((shipInfo.ship.seconds / 3600).toFixed(1));
	}
</script>

<!-- HQ Approve popover -->
<div bind:this={approvePopover} class={styleAdminPopover} popover id="hq-approve">
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
		<p class="text-sm">
			Payout: {notesPayout} notes ({adjustedHours}h x {NOTES_PER_HOUR} notes/h)
		</p>
		<label class="block">
			<span class="text-sm">Comment for shipper (required)</span>
			<textarea
				required
				name="userComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Visible to the shipper"
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal comment / Hours justification (required)</span>
			<textarea
				required
				name="internalComment"
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
						<td>{shipInfo.approval?.review.adjustedHours ?? 'N/A'}h</td>
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
