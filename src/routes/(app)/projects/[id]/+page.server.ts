import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail, isValidationError } from '@sveltejs/kit';
import { isProjectCategory, validUrl, type ProjectCategory } from '$lib';
import { getProjects } from '$lib/server/hackatimeProjects';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';

export const load: PageServerLoad = async ({ locals, params }) => {
	const projectId = Number(params.id);

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
	const pendingShips = projectShips.filter((s) => s.status == 'PENDING');

	const shippedSeconds = projectShips
		.filter((p) => p.status == 'APPROVED')
		.reduce((sum, s) => sum + s.seconds, 0);
	const shippableSeconds = project.hackatimeSeconds ? project.hackatimeSeconds - shippedSeconds : 0;

	const dirty = await marked(project.description ?? '');
	const descriptionHtml = sanitizeHtml(dirty, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
	});

	return {
		project,
		descriptionHtml,
		shippableSeconds,
		user,
		pendingShips,
		currentUserId: locals.user?.id,
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const projectId = Number(params.id);

		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
		if (!project || project.userId != locals.user?.id) return fail(403, { error: 'Forbidden' });

		const takenHackatimeProjects = (
			await db
				.select({ existingHackatimeProjects: projects.hackatimeProjects })
				.from(projects)
				.where(eq(projects.userId, project.userId))
		)
			.map((p) => p.existingHackatimeProjects)
			.reduce((sum, s) => sum.concat(s), []);

		const data = await request.formData();
		const title = (data.get('title') as string)?.trim();
		const description = (data.get('description') as string)?.trim();
		const coverArt = (data.get('coverArt') as string | null)?.trim();
		const githubUrl = (data.get('githubUrl') as string | null)?.trim();
		const demoUrl = (data.get('demoUrl') as string | null)?.trim();
		const categoryValue = String(data.get('category') ?? '').trim();
		const newHackatimeProjects = (data.getAll('hackatimeProjects') ?? []) as string[];
		const updatedHackatimeProjects = [...newHackatimeProjects, ...project.hackatimeProjects];

		if (!isProjectCategory(categoryValue)) {
			return fail(400, { error: 'Invalid category' });
		}
		if (newHackatimeProjects.some((elem) => takenHackatimeProjects.includes(elem))) {
			return fail(400, 'Hackatime project taken');
		}

		const category: ProjectCategory = categoryValue;

		await db
			.update(projects)
			.set({
				title,
				description,
				coverArt,
				githubUrl,
				demoUrl,
				category,
				hackatimeProjects: updatedHackatimeProjects,
			})
			.where(eq(projects.id, projectId));
	},
	ship: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);
		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });
		if (!validUrl(project.githubUrl) || !validUrl(project.demoUrl)) {
			return fail(400, 'Github and Demo URLs required');
		}
		if (project.hackatimeProjects.length == 0) {
			return fail(400, 'Must have a Hackatime project');
		}

		const projectShips = await db.select().from(ships).where(eq(ships.projectId, projectId));
		if (projectShips.some((p) => p.status == 'PENDING')) return fail(400, 'Already shipped');

		const shippedSeconds = projectShips
			.filter((p) => p.status == 'APPROVED')
			.reduce((sum, s) => sum + s.seconds, 0);
		const newSeconds = project.hackatimeSeconds! - shippedSeconds;

		if (newSeconds < 3600) return fail(400, 'Must have at least an hour before shipping');

		await db.insert(ships).values({ projectId, seconds: newSeconds });
	},
	cancelShip: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);
		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });

		await db
			.update(ships)
			.set({ status: 'CANCELLED' })
			.where(and(eq(ships.status, 'PENDING'), eq(ships.projectId, project.id)));
	},
};
