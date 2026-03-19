import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const pageNum = Number(url.searchParams.get('page')) ?? 0;
	const pageSize = 20;

	const projectList = await db
		.select()
		.from(projects)
		.orderBy(projects.id)
		.limit(pageSize)
		.offset(pageSize * pageNum);

	return new Response(JSON.stringify(projectList));
};
