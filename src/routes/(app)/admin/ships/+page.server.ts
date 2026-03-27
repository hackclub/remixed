import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import {
	deletedProjects,
	deletedShips,
	projects,
	shipReviews,
	ships,
	users,
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendReviewDM } from '$lib/server/slack/review_message';
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
	reject: async ({ locals, request }) => {
		const data = await request.formData();
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();
		const shipId = Number(data.get('shipId'));

		if (!userComment || !internalComment) {
			return fail(400, { error: 'Both user and internal comments are required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'PENDING') {
			return fail(400, { error: 'Ship not available for rejection' });
		}

		const slackResult = await sendReviewDM(
			shipInfo.user.slackId,
			shipInfo.project.title,
			'rejected',
			userComment,
		);

		await Promise.all([
			db.update(ships).set({ status: 'REJECTED', feedback: userComment }).where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'REJECTION',
				userComment,
				internalComment,
				slackMessageTs: slackResult.ts ?? null,
				slackChannelId: slackResult.channel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reject',
				data: { userComment, internalComment },
			}),
		]);
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const adjustedHours = Number(data.get('adjustedHours'));
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();

		if (!userComment || !internalComment) {
			return fail(400, { error: 'Both user and internal comments are required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'PENDING') {
			return fail(400, { error: 'Ship not available for approval' });
		}

		const maxHours = shipInfo.ship.seconds / 3600;
		if (adjustedHours <= 0 || adjustedHours > maxHours + 0.01) {
			return fail(400, { error: `Hours must be between 0 and ${maxHours.toFixed(1)}` });
		}

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'REVIEWER_APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'APPROVAL',
				userComment,
				internalComment,
				adjustedHours,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reviewer_approve',
				data: {
					adjustedHours,
					notesPayout: Math.ceil(adjustedHours * NOTES_PER_HOUR),
					userComment,
					internalComment,
				},
			}),
		]);
	},
	comment: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const comment = (data.get('comment') as string).trim();
		const isInternal = data.get('isInternal') === 'on';

		if (!comment) {
			return fail(400, { error: 'Comment is required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo) {
			return fail(404, { error: 'Ship not found' });
		}

		let slackTs: string | undefined;
		let slackChannel: string | undefined;

		if (!isInternal) {
			const slackResult = await sendReviewDM(
				shipInfo.user.slackId,
				shipInfo.project.title,
				'comment',
				comment,
			);
			slackTs = slackResult.ts;
			slackChannel = slackResult.channel;
		}

		await Promise.all([
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'COMMENT',
				userComment: isInternal ? null : comment,
				internalComment: isInternal ? comment : null,
				isInternal,
				slackMessageTs: slackTs ?? null,
				slackChannelId: slackChannel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'comment',
				data: { comment, isInternal },
			}),
		]);
	},
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
