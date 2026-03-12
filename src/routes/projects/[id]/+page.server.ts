import { db } from '$lib/server/db';
import { projects, ships } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail } from '@sveltejs/kit';
import type { ProjectCategory } from '$lib';
import { getProjects } from '$lib/server/hackatimeProjects';
import { request } from 'node:http';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);
	const projectId = Number(params.id);

	console.time('thng');
	const [[project], projectShips] = await Promise.all([
		db.select().from(projects).where(eq(projects.id, projectId)),
		db.select().from(ships).where(eq(ships.projectId, projectId))
	]);
	console.timeEnd('thng');
	const hasPendingShip = projectShips.some((s) => s.status == 'PENDING');

	return {
		project,
		hasPendingShip,
		currentUserId: locals.user.id
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);

		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		console.log(data);
		const title = data.get('title') as string;
		const description = data.get('description') as string;
		const coverArt = data.get('coverArt') as string | null;
		const githubUrl = data.get('githubUrl') as string | null;
		const demoUrl = data.get('demoUrl') as string | null;
		const category = data.get('category') as ProjectCategory;
		const newHackatimeProjects = (data.getAll('hackatimeProjects') ?? []) as string[];
		const hackatimeProjects = [...newHackatimeProjects, ...project.hackatimeProjects];

		await db
			.update(projects)
			.set({ title, description, coverArt, githubUrl, demoUrl, category, hackatimeProjects })
			.where(eq(projects.id, projectId));
	},
	ship: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);
		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
		const approvedShips = await db
			.select()
			.from(ships)
			.where(and(eq(ships.status, 'APPROVED'), eq(ships.projectId, projectId)));
		const shippedSeconds = approvedShips.reduce((sum, s) => sum + s.seconds, 0);
		const newSeconds = project.hackatimeSeconds! - shippedSeconds;

		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });
		await db.insert(ships).values({ projectId, seconds: newSeconds });
	}
};
