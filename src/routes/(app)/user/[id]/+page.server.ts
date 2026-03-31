import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { eq, sum, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = Number(params.id);
	const [user] = await db
		.select({
			id: users.id,
			hcaId: users.hcaId,
			slackId: users.slackId,
			username: users.username,
			avatarUrl: users.avatarUrl,
			notesBalance: users.notesBalance,
			createdAt: users.createdAt,
			roles: users.roles,
			referrals: users.referrals,
		})
		.from(users)
		.where(eq(users.id, userId));
	const userProjects = await db
		.select()
		.from(projects)
		.where(eq(projects.userId, userId))
		.orderBy(projects.id);

	const [approvedHoursResult] = await db
		.select({ total: sum(ships.seconds) })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.where(and(eq(projects.userId, userId), eq(ships.status, 'APPROVED')));

	return {
		currentUser: locals.user,
		user,
		userProjects,
		totalApprovedSeconds: Number(approvedHoursResult?.total ?? 0),
	};
};
