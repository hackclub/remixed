<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	let { data } = $props();

	let activeUserId = $state(null);
	let activeUserRoles = $state([]);

	function openRolesMenu() {
		activeUserRoles = data.users.find((u) => u.id == activeUserId).roles;
		console.log(activeUserRoles);
	}
</script>

<Sidebar />

<div
	class="fixed top-1/2 left-1/2 w-90 -translate-1/2 rounded-md bg-accent p-8 text-text shadow-md"
	popover
	id="manage-roles"
>
	<h1 class="mb-8 text-center font-nikkyou text-3xl">ROLES</h1>
	<form action="?/updateRoles" method="POST">
		<input type="hidden" name="userId" value={activeUserId} />
		<select
			multiple
			name="userRoles"
			class="mb-2 w-full rounded-md bg-primary p-4 text-center font-gothic font-bold text-accent ring-primary focus:ring-2 focus:outline-none"
		>
			<option value="ORGANIZER" selected={activeUserRoles.includes('ORGANIZER')}>
				Organizer
			</option>
			<option value="REVIEWER" selected={activeUserRoles.includes('REVIEWER')}> Reviewer </option>
			<option value="STAFF" selected={activeUserRoles.includes('STAFF')}> Staff </option>
		</select>
		<sub class="mb-4 block text-center font-zcool text-text">Ctrl+Click to select multiple</sub>
		<button
			type="submit"
			class="mb-2 w-full cursor-pointer rounded-md bg-primary px-4 py-4 text-center font-gothic text-xl text-white"
			>Confirm</button
		>
		<button
			type="button"
			class="w-full cursor-pointer rounded-md bg-text px-4 py-4 text-center font-gothic text-xl text-secondary"
			popovertarget="manage-roles">Cancel</button
		>
	</form>
</div>

<div class="pt-10 pr-10 pl-40">
	<table class="w-full">
		<thead class="font-gothic text-primary">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Slack</th>
				<th>Notes</th>
				<th>Referrals</th>
				<th>Roles</th>
			</tr>
		</thead>
		<tbody class="font-zcool text-text">
			{#each data.users as user}
				<tr>
					<td>{user.id}</td>
					<td>
						<a href="/user/{user.id}">
							{user.username}
						</a>
					</td>
					<td>
						<a
							href="https://hackclub.enterprise.slack.com/team/{user.slackId}"
							target="_blank"
							rel="noopener noreferrer"
						>
							{user.slackId}
						</a>
					</td>
					<td>
						{user.notesBalance}
					</td>
					<td>
						{user.referrals}
					</td>
					<td>
						<button
							class="cursor-pointer bg-primary px-4 text-accent"
							onclick={() => {
								activeUserId = user.id;
								openRolesMenu();
							}}
							popovertarget="manage-roles">Manage</button
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
