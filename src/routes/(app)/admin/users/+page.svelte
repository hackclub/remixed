<script lang="ts">
	import Sidebar from '$lib/Sidebar.svelte';
	import { styleButton, styleInput, stylePopover } from '$lib/styles.js';
	let { data } = $props();

	let activeUserId = $state(null);
	let activeUserRoles = $state([]);

	function openRolesMenu() {
		activeUserRoles = data.users.find((u) => u.id == activeUserId).roles;
	}
</script>

<Sidebar />

<div class={stylePopover} popover id="manage-roles">
	<h1 class="mb-8 text-center font-nikkyou text-3xl">ROLES</h1>
	<form action="?/updateRoles" method="POST">
		<input type="hidden" name="userId" value={activeUserId} />
		<select multiple name="userRoles" class="{styleInput} w-full text-center font-gothic text-lg">
			<option value="ORGANIZER" selected={activeUserRoles.includes('ORGANIZER')}>
				Organizer
			</option>
			<option value="REVIEWER" selected={activeUserRoles.includes('REVIEWER')}> Reviewer </option>
			<option value="STAFF" selected={activeUserRoles.includes('STAFF')}> Staff </option>
		</select>
		<sub class="mt-2 mb-4 block text-center font-zcool text-text">Ctrl+Click to select multiple</sub
		>
		<input type="submit" class="{styleButton} mt-8 block w-full bg-primary" value="Confirm" />
	</form>
</div>

<div class="pt-20 pr-10 pl-40">
	<table class="w-full">
		<thead class="font-gothic text-text">
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
							class="cursor-pointer bg-primary px-4 font-nikkyou text-text"
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
