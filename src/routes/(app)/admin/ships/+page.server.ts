import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { deletedProjects, deletedShips, projects, ships, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { NOTES_PER_HOUR } from '$lib';

export const load: PageServerLoad = async ({ locals }) => {
	const [projectShips, archivedShips, archivedProjects, allUsers] = await Promise.all([
		db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.orderBy(ships.id),
		db.select().from(deletedShips).orderBy(deletedShips.originalId),
		db.select().from(deletedProjects).orderBy(deletedProjects.originalId),
		db.select({ id: users.id, username: users.username }).from(users),
	]);

	const archivedProjectById = new Map(
		archivedProjects.map((project) => [project.originalId, project]),
	);
	const usernameById = new Map(allUsers.map((user) => [user.id, user.username]));

	return {
		pendingShips: projectShips.filter(({ ship }) => ship.status === 'PENDING'),
		reviewerApprovedShips: projectShips.filter(
			({ ship }) => ship.status === 'REVIEWER_APPROVED',
		),
		reviewedShips: projectShips.filter(
			({ ship }) => ship.status === 'APPROVED' || ship.status === 'REJECTED',
		),
		deletedShips: archivedShips.map((ship) => {
			const project = archivedProjectById.get(ship.projectId);

			return {
				ship,
				project: project
					? {
							originalId: project.originalId,
							title: project.title,
							category: project.category,
							hackatimeProjects: project.hackatimeProjects,
							githubUrl: project.githubUrl,
							demoUrl: project.demoUrl,
						}
					: null,
				username: usernameById.get(ship.userId) ?? `User #${ship.userId}`,
				deletedByUsername:
					usernameById.get(ship.deletedByUserId) ?? `User #${ship.deletedByUserId}`,
			};
		}),
		roles: locals.user?.roles,
		notesPerHour: NOTES_PER_HOUR,
	};
};

export const actions: Actions = {
	undoReview: async ({ request, locals }) => {
		if (!locals.user?.roles.includes('ORGANIZER')) {
			return fail(403, { error: 'Only organizers can undo reviews' });
		}

		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const [ship] = await db.select().from(ships).where(eq(ships.id, shipId));

		if (!ship || ship.status === 'PENDING') {
			return fail(404, { error: 'Ship not found or already pending' });
		}

		await Promise.all([
			db.update(ships).set({ status: 'PENDING', feedback: null }).where(eq(ships.id, shipId)),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'undo_review',
				data: { previousStatus: ship.status },
			}),
		]);
	},
};
