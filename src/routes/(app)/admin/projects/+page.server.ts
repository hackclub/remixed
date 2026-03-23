import type { ProjectCategory } from '$lib';
import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const VALID_CATEGORIES: ProjectCategory[] = ['GAME', 'WEBSITE', 'DESKTOP_APP', 'CLI', 'OTHER'];

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
	const text = String(value ?? '').trim();
	return text ? text : null;
}

function parseHackatimeProjects(value: FormDataEntryValue | null): string[] {
	return Array.from(
		new Set(
			String(value ?? '')
				.split(/[\n,]/)
				.map((entry) => entry.trim())
				.filter(Boolean),
		),
	);
}

export const load: PageServerLoad = async () => {
	const [projectRows, allShips] = await Promise.all([
		db
			.select({ project: projects, user: users })
			.from(projects)
			.innerJoin(users, eq(projects.userId, users.id))
			.orderBy(projects.id),
		db.select().from(ships).orderBy(ships.id),
	]);

	const shipsByProject = new Map<number, (typeof allShips)>();
	for (const ship of allShips) {
		const projectShips = shipsByProject.get(ship.projectId) ?? [];
		projectShips.push(ship);
		shipsByProject.set(ship.projectId, projectShips);
	}

	return {
		projects: projectRows.map(({ project, user }) => {
			const projectShips = shipsByProject.get(project.id) ?? [];
			const pendingShips = projectShips.filter((ship) => ship.status === 'PENDING');
			const approvedShips = projectShips.filter((ship) => ship.status === 'APPROVED');
			const rejectedShips = projectShips.filter((ship) => ship.status === 'REJECTED');
			const approvedSeconds = approvedShips.reduce((sum, ship) => sum + ship.seconds, 0);
			const trackedSeconds = project.hackatimeSeconds ?? 0;

			return {
				project,
				user,
				stats: {
					shipCount: projectShips.length,
					pendingShips: pendingShips.length,
					approvedShips: approvedShips.length,
					rejectedShips: rejectedShips.length,
					trackedSeconds,
					approvedSeconds,
					remainingSeconds: Math.max(trackedSeconds - approvedSeconds, 0),
				},
			};
		}),
	};
};

export const actions: Actions = {
	updateProject: async ({ request }) => {
		const data = await request.formData();
		const projectId = Number(data.get('projectId'));
		const userId = Number(data.get('userId'));
		const title = String(data.get('title') ?? '').trim();
		const category = String(data.get('category') ?? '').trim() as ProjectCategory;
		const hackatimeSecondsRaw = String(data.get('hackatimeSeconds') ?? '').trim();

		if (!projectId || !userId || !title || !VALID_CATEGORIES.includes(category)) {
			return fail(400, { error: 'Invalid project update' });
		}

		const [owner, project] = await Promise.all([
			db.select({ id: users.id }).from(users).where(eq(users.id, userId)).then(([row]) => row),
			db
				.select({ id: projects.id })
				.from(projects)
				.where(eq(projects.id, projectId))
				.then(([row]) => row),
		]);

		if (!owner || !project) {
			return fail(404, { error: 'Project or owner not found' });
		}

		const hackatimeSeconds =
			hackatimeSecondsRaw === '' ? null : Number.parseInt(hackatimeSecondsRaw, 10);

		if (hackatimeSecondsRaw !== '' && Number.isNaN(hackatimeSeconds)) {
			return fail(400, { error: 'Invalid tracked time' });
		}

		await db
			.update(projects)
			.set({
				userId,
				title,
				description: normalizeOptionalText(data.get('description')),
				coverArt: normalizeOptionalText(data.get('coverArt')),
				category,
				hackatimeProjects: parseHackatimeProjects(data.get('hackatimeProjects')),
				hackatimeSeconds,
				githubUrl: normalizeOptionalText(data.get('githubUrl')),
				demoUrl: normalizeOptionalText(data.get('demoUrl')),
			})
			.where(eq(projects.id, projectId));
	},
};
