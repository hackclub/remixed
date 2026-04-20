<script lang="ts">
	import type { ActionData, PageData } from './$types';
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

<svelte:head><title>Users — Admin</title></svelte:head>

<!-- Edit user popover -->
<div
	bind:this={manageUserPopover}
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(96vw,48rem)] max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain"
	popover
	id="manage-user"
>
	{#if activeUser}
		<div class="px-5 py-4 border-b border-base-300">
			<h3 class="font-semibold text-sm">Edit User</h3>
		</div>
		<div class="p-5">
			<form action="?/updateUser" method="POST" class="space-y-3">
				<input type="hidden" name="userId" value={activeUser.id} />

				{#if form?.error}
					<div class="alert alert-error text-sm">{form.error}</div>
				{/if}

				<div class="grid grid-cols-2 gap-3 mb-2">
					<div class="bg-base-300 rounded-lg p-3">
						<p class="text-xs text-base-content/50">User ID</p>
						<p class="font-mono text-sm">{activeUser.id}</p>
					</div>
					<div class="bg-base-300 rounded-lg p-3">
						<p class="text-xs text-base-content/50">Created</p>
						<p class="text-sm">{activeUser.createdAt}</p>
					</div>
				</div>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Username</legend>
					<input
						name="username"
						class="input input-bordered input-sm w-full"
						bind:value={activeUser.username}
						required
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Slack ID</legend>
					<input
						name="slackId"
						class="input input-bordered input-sm w-full font-mono"
						bind:value={activeUser.slackId}
						required
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">HCA ID</legend>
					<input
						name="hcaId"
						class="input input-bordered input-sm w-full font-mono"
						bind:value={activeUser.hcaId}
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Avatar URL</legend>
					<input
						name="avatarUrl"
						type="url"
						class="input input-bordered input-sm w-full font-mono text-xs"
						bind:value={activeUser.avatarUrl}
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Notes Balance</legend>
					<input
						name="notesBalance"
						type="number"
						step="1"
						class="input input-bordered input-sm w-full"
						bind:value={activeUser.notesBalance}
						required
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Referrals</legend>
					<input
						name="referrals"
						type="number"
						step="1"
						class="input input-bordered input-sm w-full"
						bind:value={activeUser.referrals}
						required
					/>
				</fieldset>

				<fieldset class="fieldset p-0">
					<legend class="fieldset-legend font-normal text-xs">Roles (Ctrl+Click to multi-select)</legend>
					<select multiple name="userRoles" class="select select-bordered select-sm w-full h-28">
						<option value="ORGANIZER" selected={activeUser.roles.includes('ORGANIZER')}>Organizer</option>
						<option value="HQ" selected={activeUser.roles.includes('HQ')}>HQ</option>
						<option value="REVIEWER" selected={activeUser.roles.includes('REVIEWER')}>Reviewer</option>
						<option value="STAFF" selected={activeUser.roles.includes('STAFF')}>Staff</option>
					</select>
				</fieldset>

				<div class="flex gap-2 pt-1">
					<button
						type="button"
						class="btn btn-sm btn-outline flex-1"
						onclick={() => manageUserPopover?.hidePopover()}>Cancel</button
					>
					<input type="submit" class="btn btn-sm btn-primary flex-1" value="Save Changes" />
				</div>
			</form>
		</div>
	{/if}
</div>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">Users</h1>
	</div>

	<input
		type="search"
		bind:value={userSearch}
		class="input input-bordered input-sm w-full max-w-md"
		placeholder="Search users, Slack IDs, HCA IDs, roles, or balances"
	/>

	<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
		<table class="table table-sm table-zebra">
			<thead>
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
			<tbody>
				{#each filteredUsers as user}
					<tr>
						<td class="font-mono text-xs">{user.id}</td>
						<td>
							<div class="flex items-center gap-2">
								<img src={user.avatarUrl ?? '/404.jpg'} alt={user.username} class="w-6 h-6 rounded-full object-cover shrink-0" />
								<a href="/user/{user.id}" class="link link-hover">{user.username}</a>
							</div>
						</td>
						<td>
							<a
								href="https://hackclub.enterprise.slack.com/team/{user.slackId}"
								target="_blank"
								rel="noopener noreferrer"
								class="link link-hover font-mono text-xs"
							>
								{user.slackId}
							</a>
						</td>
						<td class="font-mono text-xs">{user.hcaId ?? '—'}</td>
						<td>{user.notesBalance}</td>
						<td>{user.referrals}</td>
						<td>
							{#if user.roles.length}
								<div class="flex flex-wrap gap-1">
									{#each user.roles as role}
										<span class="badge badge-outline badge-xs">{role}</span>
									{/each}
								</div>
							{:else}
								<span class="text-base-content/30">—</span>
							{/if}
						</td>
						<td>
							<button
								class="btn btn-xs btn-outline"
								onclick={() => openUserMenu(user)}
								popovertarget="manage-user">Edit</button
							>
						</td>
					</tr>
				{/each}
				{#if filteredUsers.length === 0}
					<tr><td colspan="8" class="text-center text-base-content/40 py-6">No users found</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
