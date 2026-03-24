import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';

type AuditInserter = Pick<typeof db, 'insert'>;

export type AuditLogInput = {
	actorUserId: number;
	category: typeof auditLogs.$inferInsert.category;
	entityType: string;
	entityId: number;
	changeType: string;
	data?: Record<string, unknown> | null;
};

export async function recordAuditLog(database: AuditInserter, entry: AuditLogInput) {
	await database.insert(auditLogs).values({
		userId: entry.actorUserId,
		category: entry.category,
		data: serializeAuditData({
			...(entry.data ?? {}),
			entityType: entry.entityType,
			entityId: entry.entityId,
			changeType: entry.changeType,
		}),
	});
}

function serializeAuditData(value: Record<string, unknown> | null | undefined) {
	if (!value) return null;
	return serializeAuditValue(value) as Record<string, unknown>;
}

function serializeAuditValue(value: unknown): unknown {
	if (value instanceof Date) {
		return value.toISOString();
	}

	if (Array.isArray(value)) {
		return value.map((entry) => serializeAuditValue(entry));
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, serializeAuditValue(entry)]),
		);
	}

	return value;
}
