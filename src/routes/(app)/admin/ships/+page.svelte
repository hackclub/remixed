<script lang="ts">
	import { formatHours } from '$lib';
	import { styleButton, styleH1, styleInput, stylePopover } from '$lib/styles.js';
	import Sidebar from '$lib/Sidebar.svelte';

	let { data } = $props();
	const payoutMults = data.payoutMults;
	const isOrg = data.roles!.includes('ORGANIZER');

	const hourMult = 60 * 60;

	let currentSeconds = $state(0);
	let notesMult = $state(payoutMults.reviewer[0]);
	let notesPayout = $derived(Math.ceil((currentSeconds * notesMult) / hourMult));
	let activeShipId = $state('');
	let activeUserId = $state('');
	let orgMultMode = $state(false);
</script>

<div class={stylePopover} popover id="confirm-approve">
	<h1 class="mb-8 text-center font-nikkyou text-3xl">APPROVE</h1>
	<form action="?/approve" method="POST">
		<input type="hidden" name="shipId" value={activeShipId} />
		<input type="hidden" name="userId" value={activeUserId} />
		<input type="hidden" name="shipSeconds" value={currentSeconds} />
		<div class="flex justify-between font-gothic">
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
			<label class="my-4 block cursor-pointer font-gothic">
				<input type="checkbox" bind:checked={orgMultMode} />
				Organizer Payout
			</label>
		{/if}
		<textarea required name="feedback" class="{styleInput} w-full font-jua" placeholder="Feedback"
		></textarea>
		<input type="submit" class="{styleButton} mt-4 w-full bg-primary" value="Confirm" />
	</form>
</div>

<div class={stylePopover} popover id="confirm-reject">
	<h1 class="mb-8 text-center font-nikkyou text-3xl">REJECT</h1>
	<form action="?/reject" method="POST">
		<input type="hidden" name="shipId" value={activeShipId} />
		<textarea
			required
			name="feedback"
			class="{styleInput} mb-4 w-full font-jua"
			placeholder="Feedback"
		></textarea>
		<input type="submit" class="{styleButton} w-full bg-accent-red" value="Confirm" />
	</form>
</div>

<div class="pt-10 pr-10 pl-40">
	<h1 class="{styleH1} mb-4 text-text">SHIPS</h1>
	<table class="w-full">
		<thead class="font-gothic text-text">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Title</th>
				<th>Type</th>
				<th>GitHub</th>
				<th>Demo</th>
				<th>Time</th>
			</tr>
		</thead>
		<tbody class="font-zcool text-text">
			{#each data.ships as shipInfo}
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
						{shipInfo.project.category}
					</td>
					<td>
						<a href={shipInfo.project.githubUrl} target="_blank" rel="noopener noreferrer">
							Github
						</a>
					</td>
					<td>
						<a href={shipInfo.project.demoUrl} target="_blank" rel="noopener noreferrer"> Demo </a>
					</td>
					<td title={shipInfo.project.hackatimeProjects.join(', ')}>
						{formatHours(shipInfo.ship.seconds)}
					</td>
					<td>
						<button
							class="cursor-pointer bg-primary px-4 font-nikkyou text-text"
							onclick={() => {
								activeUserId = String(shipInfo.user.id);
								activeShipId = String(shipInfo.ship.id);
								currentSeconds = shipInfo.ship.seconds;
							}}
							popovertarget="confirm-approve">Approve</button
						>
						<button
							class="cursor-pointer bg-accent-red px-4 font-nikkyou text-text"
							popovertarget="confirm-reject"
							onclick={() => (activeShipId = String(shipInfo.ship.id))}>Reject</button
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	td {
		border: 2px solid currentColor;
		padding: 4px 8px;
	}
	a {
		text-decoration: underline;
	}
</style>
