<script lang="ts">
	import type { PageData } from './$types';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';
	let { data }: { data: PageData } = $props();

	let activeUserId = $state<number | null>(null);
	let activeUserRoles = $state<PageData['users'][number]['roles']>([]);
	let userSearch = $state('');
	let manageRolesPopover: HTMLElement | undefined = $state();

	let filteredUsers = $derived.by(() => {
		const query = userSearch.trim().toLowerCase();
		if (!query) return data.users;

		return data.users.filter((user) =>
			[
				String(user.id),
				user.username,
				user.slackId,
				String(user.notesBalance),
				String(user.referrals),
				user.roles.join(' '),
			].some((value) => value.toLowerCase().includes(query)),
		);
	});

	function openRolesMenu(userId: number) {
		activeUserId = userId;
		activeUserRoles = data.users.find((u) => u.id === userId)?.roles ?? [];
	}
</script>

<div bind:this={manageRolesPopover} class={styleAdminPopover} popover id="manage-roles">
	<form action="?/updateRoles" method="POST" class="space-y-4">
		<input type="hidden" name="userId" value={activeUserId ?? ''} />
		<select
			multiple
			name="userRoles"
			class="{styleInput} w-full text-center font-jua text-lg text-text"
		>
			<option value="ORGANIZER" selected={activeUserRoles.includes('ORGANIZER')}>
				Organizer
			</option>
			<option value="REVIEWER" selected={activeUserRoles.includes('REVIEWER')}> Reviewer </option>
			<option value="STAFF" selected={activeUserRoles.includes('STAFF')}> Staff </option>
		</select>
		<sub class="block text-center font-jua text-light">Ctrl+Click to select multiple</sub>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => manageRolesPopover?.hidePopover()}>Cancel</button
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
			bind:value={userSearch}
			class="{styleInput} w-full max-w-xl border-2 border-text font-jua text-lg"
			placeholder="Search users, Slack IDs, roles, or balances"
		/>
	</div>
	<table class="admin-table w-full bg-accent-purple">
		<thead class="font-jua text-text">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Slack</th>
				<th>Notes</th>
				<th>Referrals</th>
				<th>Roles</th>
			</tr>
		</thead>
		<tbody class="font-jua text-text">
			{#each filteredUsers as user}
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
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							onclick={() => openRolesMenu(user.id)}
							popovertarget="manage-roles">Manage</button
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
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
