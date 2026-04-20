<script lang="ts">
	import type { PageData } from './$types';

	type AuditRow = PageData['auditLogs'][number];

	let { data }: { data: PageData } = $props();
	let auditSearch = $state('');

	function formatLabel(value: string) {
		return value
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
			.join(' ');
	}

	function getAuditField(entry: AuditRow, key: string) {
		const data = entry.auditLog.data;
		if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
		const value = data[key];
		return typeof value === 'string' || typeof value === 'number' ? value : null;
	}

	function stringifyAuditData(entry: AuditRow) {
		return JSON.stringify(entry.auditLog.data ?? {}, null, 2);
	}

	let filteredAuditLogs = $derived.by(() => {
		const query = auditSearch.trim().toLowerCase();
		if (!query) return data.auditLogs;

		return data.auditLogs.filter((entry) =>
			[
				String(entry.auditLog.id),
				entry.actor.username,
				entry.auditLog.category,
				String(getAuditField(entry, 'entityType') ?? ''),
				String(getAuditField(entry, 'entityId') ?? ''),
				String(getAuditField(entry, 'changeType') ?? ''),
				stringifyAuditData(entry),
			].some((value) => value.toLowerCase().includes(query)),
		);
	});
</script>

<svelte:head><title>Audit Logs — Admin</title></svelte:head>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-bold">Audit Logs</h1>
		<span class="text-sm text-base-content/50">{filteredAuditLogs.length} entries</span>
	</div>

	<input
		type="search"
		bind:value={auditSearch}
		class="input input-bordered input-sm w-full max-w-md"
		placeholder="Search by actor, category, entity, change type, or JSON data"
	/>

	<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
		<table class="table table-sm table-zebra">
			<thead>
				<tr>
					<th>ID</th>
					<th>When</th>
					<th>Actor</th>
					<th>Category</th>
					<th>Entity</th>
					<th>Change</th>
					<th>Data</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredAuditLogs as entry}
					<tr class="align-top">
						<td class="font-mono text-xs">{entry.auditLog.id}</td>
						<td class="text-xs whitespace-nowrap">{new Date(entry.auditLog.createdAt).toLocaleString()}</td>
						<td>@{entry.actor.username}</td>
						<td>
							<span class="badge badge-outline badge-xs">{formatLabel(entry.auditLog.category)}</span>
						</td>
						<td>
							{#if getAuditField(entry, 'entityType') && getAuditField(entry, 'entityId') != null}
								<div class="text-xs">{formatLabel(String(getAuditField(entry, 'entityType')))}</div>
								<div class="text-xs text-base-content/50 font-mono">#{getAuditField(entry, 'entityId')}</div>
							{:else}
								<span class="text-base-content/30">—</span>
							{/if}
						</td>
						<td>
							{#if getAuditField(entry, 'changeType')}
								<span class="text-xs">{formatLabel(String(getAuditField(entry, 'changeType')))}</span>
							{:else}
								<span class="text-base-content/30">—</span>
							{/if}
						</td>
						<td>
							<pre class="max-w-sm overflow-x-auto rounded bg-base-200 p-2 font-mono text-xs whitespace-pre-wrap">{stringifyAuditData(entry)}</pre>
						</td>
					</tr>
				{/each}
				{#if filteredAuditLogs.length === 0}
					<tr><td colspan="7" class="text-center text-base-content/40 py-6">No audit log entries found</td></tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
