import { isProjectCategory, type ProjectCategory } from '$lib';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { deletedProjects, deletedShips, projects, ships, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
	const [projectRows, allShips, archivedProjects, archivedShips, allUsers] = await Promise.all([
		db
			.select({ project: projects, user: users })
			.from(projects)
			.innerJoin(users, eq(projects.userId, users.id))
			.orderBy(projects.id),
		db.select().from(ships).orderBy(ships.id),
		db.select().from(deletedProjects).orderBy(deletedProjects.originalId),
		db.select().from(deletedShips).orderBy(deletedShips.originalId),
		db.select({ id: users.id, username: users.username }).from(users),
	]);

	const shipsByProject = new Map<number, typeof allShips>();
	for (const ship of allShips) {
		const projectShips = shipsByProject.get(ship.projectId) ?? [];
		projectShips.push(ship);
		shipsByProject.set(ship.projectId, projectShips);
	}

	const deletedShipsByProject = new Map<number, typeof archivedShips>();
	for (const ship of archivedShips) {
		const projectShips = deletedShipsByProject.get(ship.projectId) ?? [];
		projectShips.push(ship);
		deletedShipsByProject.set(ship.projectId, projectShips);
	}

	const usernameById = new Map(allUsers.map((user) => [user.id, user.username]));

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
		deletedProjects: archivedProjects.map((project) => {
			const projectShips = deletedShipsByProject.get(project.originalId) ?? [];
			const pendingShips = projectShips.filter((ship) => ship.status === 'PENDING');
			const approvedShips = projectShips.filter((ship) => ship.status === 'APPROVED');
			const rejectedShips = projectShips.filter((ship) => ship.status === 'REJECTED');
			const approvedSeconds = approvedShips.reduce((sum, ship) => sum + ship.seconds, 0);
			const trackedSeconds = project.hackatimeSeconds ?? 0;

			return {
				project,
				ownerUsername: usernameById.get(project.userId) ?? `User #${project.userId}`,
				deletedByUsername:
					usernameById.get(project.deletedByUserId) ?? `User #${project.deletedByUserId}`,
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
	updateProject: async ({ locals, request }) => {
		const data = await request.formData();
		const projectId = Number(data.get('projectId'));
		const userId = Number(data.get('userId'));
		const title = String(data.get('title') ?? '').trim();
		const categoryValue = String(data.get('category') ?? '').trim();
		const hackatimeSecondsRaw = String(data.get('hackatimeSeconds') ?? '').trim();

		if (!projectId || !userId || !title || !isProjectCategory(categoryValue)) {
			return fail(400, { error: 'Invalid project update' });
		}

		const category: ProjectCategory = categoryValue;

		const [owner, existingProject] = await Promise.all([
			db
				.select({ id: users.id })
				.from(users)
				.where(eq(users.id, userId))
				.then(([row]) => row),
			db
				.select()
				.from(projects)
				.where(eq(projects.id, projectId))
				.then(([row]) => row),
		]);

		if (!owner || !existingProject) {
			return fail(404, { error: 'Project or owner not found' });
		}

		const hackatimeSeconds =
			hackatimeSecondsRaw === '' ? null : Number.parseInt(hackatimeSecondsRaw, 10);

		if (hackatimeSecondsRaw !== '' && Number.isNaN(hackatimeSeconds)) {
			return fail(400, { error: 'Invalid tracked time' });
		}

		const [updatedProject] = await db
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
			.where(eq(projects.id, projectId))
			.returning();

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'PROJECT',
			entityType: 'project',
			entityId: projectId,
			changeType: 'update',
			data: {
				before: existingProject,
				after: updatedProject,
			},
		});
	},
	deleteProject: async ({ locals, request }) => {
		const data = await request.formData();
		const projectId = Number(data.get('projectId'));

		if (!projectId) {
			return fail(400, { error: 'Invalid project' });
		}

		const [project, projectShips] = await Promise.all([
			db
				.select()
				.from(projects)
				.where(eq(projects.id, projectId))
				.then(([row]) => row),
			db.select().from(ships).where(eq(ships.projectId, projectId)),
		]);

		if (!project) {
			return fail(404, { error: 'Project not found' });
		}

		const deletedAt = new Date();

		await db.transaction(async (tx) => {
			await tx.insert(deletedProjects).values({
				originalId: project.id,
				userId: project.userId,
				title: project.title,
				description: project.description,
				coverArt: project.coverArt,
				category: project.category,
				hackatimeProjects: project.hackatimeProjects,
				hackatimeSeconds: project.hackatimeSeconds,
				githubUrl: project.githubUrl,
				demoUrl: project.demoUrl,
				createdAt: project.createdAt,
				deletedAt,
				deletedByUserId: locals.user!.id,
			});

			if (projectShips.length) {
				await tx.insert(deletedShips).values(
					projectShips.map((ship) => ({
						originalId: ship.id,
						projectId: ship.projectId,
						userId: project.userId,
						seconds: ship.seconds,
						status: ship.status,
						submittedAt: ship.submittedAt,
						feedback: ship.feedback,
						deletedAt,
						deletedByUserId: locals.user!.id,
					})),
				);
			}

			await tx.delete(ships).where(eq(ships.projectId, projectId));
			await tx.delete(projects).where(eq(projects.id, projectId));

			await recordAuditLog(tx, {
				actorUserId: locals.user!.id,
				category: 'PROJECT',
				entityType: 'project',
				entityId: projectId,
				changeType: 'soft_delete',
				data: {
					title: project.title,
					deletedShipCount: projectShips.length,
					deletedShipIds: projectShips.map((ship) => ship.id),
				},
			});
		});
	},
};
