import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const userId = url.searchParams.get('id') ? Number(url.searchParams.get('id')) : locals.user?.id;
	if (!userId) return new Response('Unauthorized', { status: 401 });

	const userProjects = await db.select().from(projects).where(eq(projects.userId, userId));

	return new Response(JSON.stringify(userProjects));
};
