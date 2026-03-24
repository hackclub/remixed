import { db } from '$lib/server/db';
import { projects, ships } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const pageNum = Number(url.searchParams.get('page')) ?? 0;
	const pageSize = 20;

	const projectList = await db
		.selectDistinct()
		.from(projects)
		.innerJoin(ships, eq(ships.projectId, projects.id))
		.where(eq(ships.status, 'APPROVED'))
		.orderBy(projects.id)
		.limit(pageSize)
		.offset(pageSize * pageNum);

	return new Response(JSON.stringify(projectList.map(({ projects }) => projects)));
};
