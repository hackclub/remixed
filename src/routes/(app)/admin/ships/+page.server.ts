import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import {
	deletedProjects,
	deletedShips,
	notesLedger,
	projects,
	ships,
	users,
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';
import { sendCertMessage } from '$lib/server/slack/cert_message';

const payoutMults = {
	reviewer: [10.0, 15.0],
	organizer: [10.0, 25.0],
};

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
		payoutMults,
	};
};

export const actions: Actions = {
	reject: async ({ locals, request }) => {
		const data = await request.formData();
		const feedback = (data.get('feedback') as string).trim();
		const shipId = Number(data.get('shipId'));

		const [projectInfo] = await db
			.select({ project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		await Promise.all([
			db.update(ships).set({ status: 'REJECTED', feedback }).where(eq(ships.id, shipId)),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reject',
				data: {
					feedback,
					viaOrganizerRole: locals.user!.roles.includes('ORGANIZER'),
				},
			}),
			sendCertMessage(projectInfo.user.slackId, projectInfo.project.title, false, feedback),
		]);
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const userId = Number(data.get('userId'));
		const payoutMult = Number(data.get('payoutMult'));
		const shipSeconds = Number(data.get('shipSeconds'));
		const feedback = (data.get('feedback') as string).trim();

		const [projectInfo] = await db
			.select({ project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (locals.user!.roles.includes('ORGANIZER')) {
			if (payoutMult < payoutMults.organizer[0] || payoutMult > payoutMults.organizer[1]) {
				return;
			}
		} else {
			if (payoutMult < payoutMults.reviewer[0] || payoutMult > payoutMults.reviewer[1]) {
				return;
			}
		}
		const payout = Math.ceil((payoutMult * shipSeconds) / (60.0 * 60.0));

		await Promise.all([
			sendCertMessage(projectInfo.user.slackId, projectInfo.project.title, true, feedback),
			sendUpdatedBalance(
				projectInfo.user.slackId,
				projectInfo.user.notesBalance,
				projectInfo.user.notesBalance + payout,
			),
			db
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} + ${payout}` })
				.where(eq(users.id, userId)),
			db.update(ships).set({ status: 'APPROVED' }).where(eq(ships.id, shipId)),
			db
				.insert(notesLedger)
				.values({ userId, delta: payout, reason: 'ship_approved', refId: shipId }),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'approve',
				data: {
					shipId,
					feedback,
					viaOrganizerRole: locals.user!.roles.includes('ORGANIZER'),
					multiplier: payoutMult,
					payout,
				},
			}),
		]);
	},
	undoReview: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const [ship] = await db.select().from(ships).where(eq(ships.id, shipId));

		if (!ship || ship.status === 'PENDING') {
			return fail(404, { error: 'Ship not found' });
		}

		const [projectInfo, ledgerEntries] = await Promise.all([
			db
				.select({ project: projects, user: users })
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.innerJoin(users, eq(projects.userId, users.id))
				.where(eq(ships.id, shipId))
				.then(([row]) => row),
			db
				.select()
				.from(notesLedger)
				.where(eq(notesLedger.refId, shipId))
				.then((rows) => rows.filter((row) => row.reason === 'ship_approved')),
		]);

		if (!projectInfo) {
			return fail(404, { error: 'Ship not found' });
		}

		const awardedNotes = ledgerEntries.reduce((sum, row) => sum + row.delta, 0);
		const updates: Promise<unknown>[] = [
			db.update(ships).set({ status: 'PENDING', feedback: null }).where(eq(ships.id, shipId)),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'undo_review',
				data: { previousStatus: ship.status, awardedNotes },
			}),
		];

		if (ship.status === 'APPROVED' && awardedNotes !== 0) {
			updates.push(
				db
					.update(users)
					.set({ notesBalance: sql`${users.notesBalance} - ${awardedNotes}` })
					.where(eq(users.id, projectInfo.user.id)),
				db.insert(notesLedger).values({
					userId: projectInfo.user.id,
					delta: -awardedNotes,
					reason: 'ship_approved',
					refId: shipId,
				}),
				sendUpdatedBalance(
					projectInfo.user.slackId,
					projectInfo.user.notesBalance,
					projectInfo.user.notesBalance - awardedNotes,
				),
			);
		}

		await Promise.all(updates);
	},
};
