<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';
	type UserRow = PageData['users'][number];
	type EditableUser = {
		id: number;
		username: string;
		slackId: string;
		hcaId: string;
		avatarUrl: string;
		notesBalance: string;
		referrals: string;
		roles: UserRow['roles'];
		createdAt: string;
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeUser = $state<EditableUser | null>(null);
	let userSearch = $state('');
	let manageUserPopover: HTMLElement | undefined = $state();

	let filteredUsers = $derived.by(() => {
		const query = userSearch.trim().toLowerCase();
		if (!query) return data.users;

		return data.users.filter((user) =>
			[
				String(user.id),
				user.username,
				user.slackId,
				user.hcaId ?? '',
				user.avatarUrl ?? '',
				String(user.notesBalance),
				String(user.referrals),
				user.roles.join(' '),
			].some((value) => value.toLowerCase().includes(query)),
		);
	});

	function openUserMenu(user: UserRow) {
		activeUser = {
			id: user.id,
			username: user.username,
			slackId: user.slackId,
			hcaId: user.hcaId ?? '',
			avatarUrl: user.avatarUrl ?? '',
			notesBalance: String(user.notesBalance),
			referrals: String(user.referrals),
			roles: user.roles,
			createdAt: new Date(user.createdAt).toLocaleString(),
		};
	}
</script>

<div
	bind:this={manageUserPopover}
	class="{styleAdminPopover} w-[min(96vw,48rem)] max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
	popover
	id="manage-user"
>
	{#if activeUser}
		<form action="?/updateUser" method="POST" class="space-y-4">
			<input type="hidden" name="userId" value={activeUser.id} />

			{#if form?.error}
				<p class="rounded-xl border-2 border-red-500 bg-red-100 px-4 py-3 font-jua text-lg text-red-900">
					{form.error}
				</p>
			{/if}

			<div class="user-summary grid font-jua text-sm text-light sm:grid-cols-2">
				<div class="user-summary__item">
					<p class="user-summary__label">User ID</p>
					<p class="user-summary__value">{activeUser.id}</p>
				</div>
				<div class="user-summary__item">
					<p class="user-summary__label">Created</p>
					<p class="user-summary__value">{activeUser.createdAt}</p>
				</div>
			</div>

			<label for="username" class="block font-jua text-2xl text-light">Username</label>
			<input
				id="username"
				name="username"
				class="{styleInput} w-full font-jua text-text"
				bind:value={activeUser.username}
				required
			/>

			<label for="slackId" class="block font-jua text-2xl text-light">Slack ID</label>
			<input
				id="slackId"
				name="slackId"
				class="{styleInput} w-full font-mono text-text"
				bind:value={activeUser.slackId}
				required
			/>

			<label for="hcaId" class="block font-jua text-2xl text-light">HCA ID</label>
			<input
				id="hcaId"
				name="hcaId"
				class="{styleInput} w-full font-mono text-text"
				bind:value={activeUser.hcaId}
			/>

			<label for="avatarUrl" class="block font-jua text-2xl text-light">Avatar URL</label>
			<input
				id="avatarUrl"
				name="avatarUrl"
				type="url"
				class="{styleInput} w-full font-mono text-xs text-text"
				bind:value={activeUser.avatarUrl}
			/>

			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label for="notesBalance" class="block font-jua text-2xl text-light">Notes</label>
					<input
						id="notesBalance"
						name="notesBalance"
						type="number"
						step="1"
						class="{styleInput} w-full font-jua text-text"
						bind:value={activeUser.notesBalance}
						required
					/>
				</div>
				<div>
					<label for="referrals" class="block font-jua text-2xl text-light">Referrals</label>
					<input
						id="referrals"
						name="referrals"
						type="number"
						step="1"
						class="{styleInput} w-full font-jua text-text"
						bind:value={activeUser.referrals}
						required
					/>
				</div>
			</div>

			<label for="userRoles" class="block font-jua text-2xl text-light">Roles</label>
			<select
				id="userRoles"
				multiple
				name="userRoles"
				class="{styleInput} w-full text-center font-jua text-lg text-text"
			>
				<option value="ORGANIZER" selected={activeUser.roles.includes('ORGANIZER')}>
					Organizer
				</option>
				<option value="HQ" selected={activeUser.roles.includes('HQ')}>HQ</option>
				<option value="REVIEWER" selected={activeUser.roles.includes('REVIEWER')}>Reviewer</option>
				<option value="STAFF" selected={activeUser.roles.includes('STAFF')}>Staff</option>
			</select>
			<sub class="block text-center font-jua text-light">Ctrl+Click to select multiple</sub>

			<div class="flex gap-3 pt-2">
				<button
					type="button"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					onclick={() => manageUserPopover?.hidePopover()}>Cancel</button
				>
				<input
					type="submit"
					class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
					value="Save Changes"
				/>
			</div>
		</form>
	{/if}
</div>

<div class="p-10 pb-40 font-jua text-text">
	<div class="mb-6">
		<input
			type="search"
			bind:value={userSearch}
			class="{styleInput} w-full max-w-xl border-2 border-text font-jua text-lg"
			placeholder="Search users, Slack IDs, HCA IDs, roles, or balances"
		/>
	</div>
	<table class="admin-table w-full bg-accent-purple">
		<thead class="font-jua text-text">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Slack</th>
				<th>HCA</th>
				<th>Notes</th>
				<th>Referrals</th>
				<th>Roles</th>
				<th>Actions</th>
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
					<td>{user.hcaId ?? '—'}</td>
					<td>
						{user.notesBalance}
					</td>
					<td>
						{user.referrals}
					</td>
					<td>{user.roles.join(', ')}</td>
					<td>
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							onclick={() => openUserMenu(user)}
							popovertarget="manage-user">Edit</button
						>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.user-summary {
		gap: 0.75rem;
	}
	.user-summary__item {
		border: 2px solid var(--color-text);
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
	}
	.user-summary__label {
		opacity: 0.75;
	}
	.user-summary__value {
		font-size: 1rem;
	}
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
