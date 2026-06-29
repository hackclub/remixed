<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { KeyRound, Copy, Check, Trash2, Ban } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copied = $state(false);

	function fmtDate(value: Date | string | null) {
		if (!value) return '—';
		return new Date(value).toLocaleString();
	}

	async function copyToken(token: string) {
		try {
			await navigator.clipboard.writeText(token);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}

	let claudeCommand = $derived(
		form?.created
			? `claude mcp add --transport http remixed-admin ${data.mcpUrl} --header "Authorization: Bearer ${form.created.token}"`
			: '',
	);
</script>

<svelte:head><title>MCP Tokens — Admin</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-bold flex items-center gap-2">
				<KeyRound size={20} /> Admin MCP
			</h1>
			<p class="text-sm text-base-content/60 mt-1">
				Create bearer tokens to connect Claude Code (or any MCP client) to the admin API.
			</p>
		</div>
		<span class="text-sm text-base-content/50">{data.tokens.length} tokens</span>
	</div>

	<div class="rounded-box border border-base-300 bg-base-100 p-4 space-y-2">
		<div class="text-sm font-semibold">Endpoint</div>
		<code class="text-xs break-all bg-base-200 rounded px-2 py-1 inline-block">{data.mcpUrl}</code>
		<p class="text-xs text-base-content/60">
			A token acts as <span class="font-semibold">your</span> admin account — every write is
			recorded in the audit log under whoever created the token.
		</p>
	</div>

	{#if form?.created}
		<div class="alert alert-success flex-col items-start gap-3">
			<div class="font-semibold">
				Token “{form.created.name}” created — copy it now, it won't be shown again.
			</div>
			<div class="flex items-center gap-2 w-full">
				<code class="text-xs break-all bg-base-100 text-base-content rounded px-2 py-1 flex-1"
					>{form.created.token}</code
				>
				<button type="button" class="btn btn-sm" onclick={() => copyToken(form!.created!.token)}>
					{#if copied}<Check size={14} /> Copied{:else}<Copy size={14} /> Copy{/if}
				</button>
			</div>
			<div class="w-full">
				<div class="text-xs font-semibold mb-1">Add to Claude Code:</div>
				<code class="text-xs break-all bg-base-100 text-base-content rounded px-2 py-1 block"
					>{claudeCommand}</code
				>
			</div>
		</div>
	{/if}

	{#if form?.error}
		<div class="alert alert-error text-sm">{form.error}</div>
	{/if}

	<form method="POST" action="?/create" use:enhance class="flex items-end gap-2">
		<div class="form-control">
			<label class="label py-1" for="token-name">
				<span class="label-text text-sm">New token name</span>
			</label>
			<input
				id="token-name"
				name="name"
				type="text"
				required
				maxlength="80"
				placeholder="e.g. asc's laptop"
				class="input input-bordered input-sm w-72"
			/>
		</div>
		<button type="submit" class="btn btn-primary btn-sm">Create token</button>
	</form>

	<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
		<table class="table table-sm table-zebra">
			<thead>
				<tr>
					<th>Name</th>
					<th>Prefix</th>
					<th>Created by</th>
					<th>Created</th>
					<th>Last used</th>
					<th>Status</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each data.tokens as token (token.id)}
					<tr class:opacity-50={Boolean(token.revokedAt)}>
						<td class="font-medium">{token.name}</td>
						<td><code class="text-xs">{token.prefix}…</code></td>
						<td>{token.createdByUsername}</td>
						<td class="text-xs">{fmtDate(token.createdAt)}</td>
						<td class="text-xs">{fmtDate(token.lastUsedAt)}</td>
						<td>
							{#if token.revokedAt}
								<span class="badge badge-ghost badge-sm">Revoked</span>
							{:else}
								<span class="badge badge-success badge-sm">Active</span>
							{/if}
						</td>
						<td class="text-right">
							<div class="flex justify-end gap-1">
								{#if !token.revokedAt}
									<form method="POST" action="?/revoke" use:enhance>
										<input type="hidden" name="id" value={token.id} />
										<button
											type="submit"
											class="btn btn-ghost btn-xs text-warning"
											title="Revoke"
										>
											<Ban size={14} />
										</button>
									</form>
								{/if}
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={token.id} />
									<button type="submit" class="btn btn-ghost btn-xs text-error" title="Delete">
										<Trash2 size={14} />
									</button>
								</form>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="7" class="text-center text-base-content/50 py-6">
							No tokens yet. Create one above to connect an MCP client.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
