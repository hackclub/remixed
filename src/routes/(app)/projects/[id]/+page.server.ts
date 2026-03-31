import { db } from '$lib/server/db';
import { projects, shipReviews, ships, users } from '$lib/server/db/schema';
import { and, eq, inArray, desc } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail, isValidationError } from '@sveltejs/kit';
import { isProjectCategory, validUrl, type ProjectCategory } from '$lib';
import { getProjects } from '$lib/server/hackatimeProjects';
import sanitizeHtml from 'sanitize-html';
import { marked } from 'marked';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals, params }) => {
	const projectId = Number(params.id);

	const [[projectInfo], projectShips] = await Promise.all([
		db
			.select({
				projects,
				users: {
					id: users.id,
					username: users.username,
					avatarUrl: users.avatarUrl,
				},
			})
			.from(projects)
			.innerJoin(users, eq(users.id, projects.userId))
			.where(eq(projects.id, projectId)),
		db.select().from(ships).where(eq(ships.projectId, projectId)),
	]);
	const project = projectInfo.projects;
	const user = projectInfo.users;
	const pendingShips = projectShips.filter(
		(s) => s.status == 'PENDING' || s.status == 'REVIEWER_APPROVED',
	);

	const shippableSeconds = project.hackatimeSeconds
		? project.hackatimeSeconds - project.committedSeconds
		: 0;

	const dirty = await marked(project.description ?? '');
	const descriptionHtml = sanitizeHtml(dirty, {
		allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
	});

	const isOwner = locals.user?.id === project.userId;

	let shipHistory: typeof projectShips = [];
	let shipFeedback: (typeof shipReviews.$inferSelect)[] = [];

	if (isOwner && projectShips.length > 0) {
		shipHistory = projectShips
			.filter((s) => s.status !== 'CANCELLED')
			.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

		const allShipIds = projectShips.map((s) => s.id);
		shipFeedback = await db
			.select()
			.from(shipReviews)
			.where(and(inArray(shipReviews.shipId, allShipIds), eq(shipReviews.isInternal, false)))
			.orderBy(shipReviews.createdAt);
	}

	return {
		project,
		descriptionHtml,
		shippableSeconds,
		user,
		pendingShips,
		currentUserId: locals.user?.id,
		shipHistory,
		shipFeedback,
		shipsAllowed: env.SHIPS_ALLOWED === 'true',
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const projectId = Number(params.id);

		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
		if (!project || project.userId != locals.user?.id) return fail(403, { error: 'Forbidden' });

		const takenHackatimeProjects = (
			await db
				.select({ id: projects.id, existingHackatimeProjects: projects.hackatimeProjects })
				.from(projects)
				.where(eq(projects.userId, project.userId))
		)
			.filter((p) => p.id != projectId)
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
				hackatimeProjects: newHackatimeProjects,
			})
			.where(eq(projects.id, projectId));
	},
	ship: async ({ locals, params }) => {
		if (env.SHIPS_ALLOWED !== 'true') return fail(403, { error: 'Shipping is not enabled' });
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
		if (projectShips.some((p) => p.status == 'PENDING' || p.status == 'REVIEWER_APPROVED'))
			return fail(400, 'Already shipped');

		const newSeconds = project.hackatimeSeconds! - project.committedSeconds;

		if (newSeconds < 3600) return fail(400, 'Must have at least an hour before shipping');

		await db.insert(ships).values({
			projectId,
			seconds: newSeconds,
			capturedSeconds: project.hackatimeSeconds!,
		});
	},
	cancelShip: async ({ locals, params }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);
		const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });

		await db
			.update(ships)
			.set({ status: 'CANCELLED' })
			.where(
				and(
					inArray(ships.status, ['PENDING', 'REVIEWER_APPROVED']),
					eq(ships.projectId, project.id),
				),
			);
	},
};
