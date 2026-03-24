<script lang="ts">
	import { styleInput } from '$lib/styles';
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

<div class="p-10 pb-40 font-jua text-text">
	<div class="mb-6">
		<input
			type="search"
			bind:value={auditSearch}
			class="{styleInput} w-full max-w-xl border-2 border-text font-jua text-lg"
			placeholder="Search by actor, category, entity, change type, or JSON data"
		/>
	</div>

	<table class="admin-table w-full bg-accent-purple">
		<thead class="font-jua text-text">
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
		<tbody class="font-jua text-text">
			{#each filteredAuditLogs as entry}
				<tr>
					<td>{entry.auditLog.id}</td>
					<td>{new Date(entry.auditLog.createdAt).toLocaleString()}</td>
					<td>@{entry.actor.username}</td>
					<td>{formatLabel(entry.auditLog.category)}</td>
					<td>
						{#if getAuditField(entry, 'entityType') && getAuditField(entry, 'entityId') != null}
							<div>{formatLabel(String(getAuditField(entry, 'entityType')))}</div>
							<div class="text-sm text-text/70">#{getAuditField(entry, 'entityId')}</div>
						{:else}
							<span class="text-text/60">Unknown</span>
						{/if}
					</td>
					<td>
						{#if getAuditField(entry, 'changeType')}
							{formatLabel(String(getAuditField(entry, 'changeType')))}
						{:else}
							<span class="text-text/60">Unknown</span>
						{/if}
					</td>
					<td>
						<pre
							class="max-w-[34rem] overflow-x-auto rounded-lg bg-light/70 p-3 font-mono text-xs whitespace-pre-wrap">{stringifyAuditData(
								entry,
							)}</pre>
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
		vertical-align: top;
	}
	th:last-child,
	td:last-child {
		border-right: none;
	}
	tbody tr:last-child td {
		border-bottom: none;
	}
</style>
