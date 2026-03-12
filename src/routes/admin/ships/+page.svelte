<script lang="ts">
	import { formatHours } from '$lib';
	import Sidebar from '$lib/Sidebar.svelte';

	const hourMult = 60 * 60;
	const normalMult = 5.0;
	const lowEffortMult = 3.0;
	const highEffortMult = 8.5;

	let { data } = $props();
	let currentSeconds = $state(0);
	let normalPayout = $derived(Math.ceil((currentSeconds * normalMult) / hourMult));
	let lowEffortPayout = $derived(Math.ceil((currentSeconds * lowEffortMult) / hourMult));
	let highEffortPayout = $derived(Math.ceil((currentSeconds * highEffortMult) / hourMult));
	let activeShipId = $state('');
	let activeUserId = $state('');
</script>

<Sidebar />
<div
	class="fixed top-1/2 left-1/2 w-90 -translate-1/2 rounded-md bg-accent p-8 text-text shadow-md"
	popover
	id="confirm-approve"
>
	<h1 class="mb-8 text-center font-nikkyou text-3xl">APPROVE</h1>
	<form action="?/approve" method="POST">
		<input type="hidden" name="shipId" value={activeShipId} />
		<input type="hidden" name="userId" value={activeUserId} />
		<button
			type="submit"
			name="payout"
			value={normalPayout}
			class="mb-4 w-full cursor-pointer rounded-md bg-primary px-4 py-4 text-center font-gothic text-white"
			>Normal ({normalPayout})</button
		>
		<button
			type="submit"
			name="payout"
			value={lowEffortPayout}
			class="mb-1 w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xs text-white"
			>Low Effort ({lowEffortPayout})</button
		>
		<button
			type="submit"
			name="payout"
			value={highEffortPayout}
			class="mb-4 w-full cursor-pointer rounded-md bg-primary px-4 py-2 text-center font-gothic text-xs text-white"
			>High Effort ({highEffortPayout})</button
		>
		<button
			type="button"
			class="w-full cursor-pointer rounded-md bg-text px-4 py-4 text-center font-gothic text-xl text-secondary"
			popovertarget="confirm-approve">Cancel</button
		>
	</form>
</div>

<div
	class="fixed top-1/2 left-1/2 w-90 -translate-1/2 rounded-md bg-accent p-8 text-text shadow-md"
	popover
	id="confirm-reject"
>
	<h1 class="mb-8 text-center font-nikkyou text-3xl">REJECT</h1>
	<form action="?/reject" method="POST">
		<input type="hidden" name="shipId" value={activeShipId} />
		<button
			type="submit"
			class="mb-4 w-full cursor-pointer rounded-md bg-primary px-4 py-4 text-center font-gothic text-xl text-white"
			>Reject</button
		>
		<button
			type="button"
			class="w-full cursor-pointer rounded-md bg-text px-4 py-4 text-center font-gothic text-xl text-secondary"
			popovertarget="confirm-reject">Cancel</button
		>
	</form>
</div>

<div class="pt-10 pr-10 pl-40">
	<table class="w-full">
		<thead class="font-gothic text-primary">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Title</th>
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
					<td class="">
						<a href="/projects/{shipInfo.project.id}">
							{shipInfo.project.title}
						</a>
					</td>
					<td>
						<a href={shipInfo.project.githubUrl} target="_blank" rel="noopener noreferrer">
							Github
						</a>
					</td>
					<td>
						<a href={shipInfo.project.demoUrl} target="_blank" rel="noopener noreferrer"> Demo </a>
					</td>
					<td title={JSON.stringify(shipInfo.project.hackatimeProjects)}>
						{formatHours(shipInfo.ship.seconds)}
					</td>
					<td>
						<button
							class="cursor-pointer bg-green-500 px-4 text-white"
							onclick={() => {
								activeUserId = String(shipInfo.user.id);
								activeShipId = String(shipInfo.ship.id);
								currentSeconds = shipInfo.ship.seconds;
							}}
							popovertarget="confirm-approve">Approve</button
						>
						<button
							class="cursor-pointer bg-primary px-4 text-white"
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
