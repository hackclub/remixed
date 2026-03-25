import { db } from '$lib/server/db';
import { projects, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
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
	return {
		currentUser: locals.user,
		user,
		userProjects,
	};
};
