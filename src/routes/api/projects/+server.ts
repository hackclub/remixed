import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const userId = url.searchParams.get('id') ?? cookies.get('session_user_id');
	const projs = await db.select().from(projects).where(eq(projects.userId, userId));

	return new Response(JSON.stringify(projs));
};
