import { db } from '$lib/server/db';
import { projects, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = Number(params.id);
	const userProjects = await db
		.select()
		.from(projects)
		.where(eq(projects.userId, userId))
		.orderBy(projects.id);
	return {
		user: locals.user,
		userProjects,
	};
};
