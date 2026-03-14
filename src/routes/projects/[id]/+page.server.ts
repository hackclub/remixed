import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail, isValidationError } from '@sveltejs/kit';
import { validUrl, type ProjectCategory } from '$lib';
import { getProjects } from '$lib/server/hackatimeProjects';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);
	const projectId = Number(params.id);

	console.time('thng');
	const [[projectInfo], projectShips] = await Promise.all([
		db
			.select()
			.from(projects)
			.innerJoin(users, eq(users.id, projects.userId))
			.where(eq(projects.id, projectId)),
		db.select().from(ships).where(eq(ships.projectId, projectId)),
	]);
	const project = projectInfo.projects;
	const user = projectInfo.users;
	console.timeEnd('thng');
	const hasPendingShip = projectShips.some((s) => s.status == 'PENDING');

	return {
		project,
		user,
		hasPendingShip,
		currentUserId: locals.user.id,
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
		const title = (data.get('title') as string)?.trim();
		const description = (data.get('description') as string)?.trim();
		const coverArt = (data.get('coverArt') as string | null)?.trim();
		const githubUrl = (data.get('githubUrl') as string | null)?.trim();
		const demoUrl = (data.get('demoUrl') as string | null)?.trim();
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

		if (project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });
		if (!validUrl(project.githubUrl) || !validUrl(project.demoUrl)) {
			return fail(400, 'Github and Demo URLs required');
		}

		const approvedShips = await db
			.select()
			.from(ships)
			.where(and(eq(ships.status, 'APPROVED'), eq(ships.projectId, projectId)));
		const shippedSeconds = approvedShips.reduce((sum, s) => sum + s.seconds, 0);
		const newSeconds = project.hackatimeSeconds! - shippedSeconds;

		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });
		await db.insert(ships).values({ projectId, seconds: newSeconds });
	},
};
