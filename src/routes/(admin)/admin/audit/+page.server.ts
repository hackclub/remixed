import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const logs = await db
		.select({ auditLog: auditLogs, actor: users })
		.from(auditLogs)
		.innerJoin(users, eq(auditLogs.userId, users.id))
		.orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));

	return { auditLogs: logs };
};
