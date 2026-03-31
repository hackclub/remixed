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
import { and, eq, sql } from 'drizzle-orm';
import { NOTES_PER_HOUR } from '$lib';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';

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
		const shipId = Number(data.get('shipId'));
		const auditedShipId = Number.isFinite(shipId) ? shipId : 0;

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHIP_REVIEW',
			entityType: 'ship',
			entityId: auditedShipId,
			changeType: 'legacy_reject_blocked',
			data: {
				shipId: auditedShipId,
				message:
					'Blocked legacy /admin/ships reject action; use /admin/ships/[id] reviewer workflow instead.',
			},
		});

		return fail(410, {
			error:
				'Legacy reject action is disabled. Use /admin/ships/[id] to submit reviewer decisions.',
		});
	},
	approve: async ({ locals, request }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const auditedShipId = Number.isFinite(shipId) ? shipId : 0;

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHIP_REVIEW',
			entityType: 'ship',
			entityId: auditedShipId,
			changeType: 'legacy_approve_blocked',
			data: {
				shipId: auditedShipId,
				message:
					'Blocked legacy /admin/ships approve action; use /admin/ships/[id] reviewer workflow and /admin/hq for finalization.',
			},
		});

		return fail(410, {
			error:
				'Legacy approve action is disabled. Use /admin/ships/[id] for reviewer approval and /admin/hq for HQ final approval.',
		});
	},
	undoReview: async ({ request, locals }) => {
		if (!locals.user?.roles.includes('ORGANIZER')) {
			return fail(403, { error: 'Only organizers can undo reviews' });
		}

		const data = await request.formData();
		const shipId = Number(data.get('shipId'));

		if (!Number.isFinite(shipId) || shipId <= 0) {
			return fail(400, { error: 'Invalid ship id' });
		}

		const outcome = await db.transaction(async (tx) => {
			const [shipInfo] = await tx
				.select({ ship: ships, project: projects, user: users })
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.innerJoin(users, eq(projects.userId, users.id))
				.where(eq(ships.id, shipId));

			if (!shipInfo || shipInfo.ship.status === 'PENDING') {
				return { notFound: true as const };
			}

			let oldBalance: number | null = null;
			let newBalance: number | null = null;
			let awardedNotes = 0;

			if (shipInfo.ship.status === 'APPROVED') {
				const awardedRows = await tx
					.select({ delta: notesLedger.delta })
					.from(notesLedger)
					.where(
						and(eq(notesLedger.refId, shipId), eq(notesLedger.reason, 'ship_approved')),
					);

				awardedNotes = awardedRows.reduce((sum, row) => sum + row.delta, 0);

				await tx
					.update(projects)
					.set({
						committedSeconds: sql`GREATEST(${projects.committedSeconds} - ${shipInfo.ship.seconds}, 0)`,
					})
					.where(eq(projects.id, shipInfo.project.id));

				if (awardedNotes !== 0) {
					const [updatedUser] = await tx
						.update(users)
						.set({ notesBalance: sql`${users.notesBalance} - ${awardedNotes}` })
						.where(eq(users.id, shipInfo.user.id))
						.returning({ notesBalance: users.notesBalance });

					oldBalance = updatedUser.notesBalance + awardedNotes;
					newBalance = updatedUser.notesBalance;

					await tx.insert(notesLedger).values({
						userId: shipInfo.user.id,
						delta: -awardedNotes,
						reason: 'ship_approved_undo',
						refId: shipId,
					});
				}
			}

			await tx
				.update(ships)
				.set({ status: 'PENDING', feedback: null })
				.where(eq(ships.id, shipId));

			await recordAuditLog(tx, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'undo_review',
				data: {
					previousStatus: shipInfo.ship.status,
					awardedNotes,
					revertedCommittedSeconds:
						shipInfo.ship.status === 'APPROVED' ? shipInfo.ship.seconds : 0,
				},
			});

			return {
				notFound: false as const,
				slackId: shipInfo.user.slackId,
				oldBalance,
				newBalance,
			};
		});

		if (outcome.notFound) {
			return fail(404, { error: 'Ship not found or already pending' });
		}

		if (outcome.oldBalance !== null && outcome.newBalance !== null) {
			await sendUpdatedBalance(outcome.slackId, outcome.oldBalance, outcome.newBalance);
		}
	},
};
