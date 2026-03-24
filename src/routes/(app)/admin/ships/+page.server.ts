import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { auditLogs, notesLedger, projects, ships, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';
import { sendCertMessage } from '$lib/server/slack/cert_message';

const payoutMults = {
	reviewer: [10.0, 15.0],
	organizer: [10.0, 25.0],
};

export const load: PageServerLoad = async ({ locals }) => {
	const projectShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.orderBy(ships.id);
	return {
		pendingShips: projectShips.filter(({ ship }) => ship.status === 'PENDING'),
		reviewedShips: projectShips.filter(
			({ ship }) => ship.status === 'APPROVED' || ship.status === 'REJECTED',
		),
		roles: locals.user?.roles,
		payoutMults,
	};
};

export const actions: Actions = {
	reject: async ({ locals, request }) => {
		const data = await request.formData();
		const feedback = (data.get('feedback') as string).trim();
		const shipId = Number(data.get('shipId'));
		const [user] = await db.select().from(users).where(eq(users.id, locals.user!.id));
		await Promise.all([
			db.update(ships).set({ status: 'REJECTED', feedback }).where(eq(ships.id, shipId)),
			db.insert(auditLogs).values({
				category: 'SHIP_REVIEW',
				userId: locals.user!.id,
				data: { approved: false, shipId, org: locals.user!.roles.includes('ORGANIZER') },
			}),
			db
				.select({ project: projects })
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.then(([proj]) => sendCertMessage(user.slackId, proj.project.title, false, feedback)),
		]);
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const userId = Number(data.get('userId'));
		const payoutMult = Number(data.get('payoutMult'));
		const shipSeconds = Number(data.get('shipSeconds'));
		const feedback = (data.get('feedback') as string).trim();

		const [user] = await db.select().from(users).where(eq(users.id, locals.user!.id));
		if (user.roles.includes('ORGANIZER')) {
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
			db
				.select({ project: projects })
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.then(([proj]) => sendCertMessage(user.slackId, proj.project.title, true, feedback))
				.then(() =>
					sendUpdatedBalance(user.slackId, user.notesBalance, user.notesBalance + payout),
				),
			db
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} + ${payout}` })
				.where(eq(users.id, userId)),
			db.update(ships).set({ status: 'APPROVED' }).where(eq(ships.id, shipId)),
			db
				.insert(notesLedger)
				.values({ userId, delta: payout, reason: 'ship_approved', refId: shipId }),
			db.insert(auditLogs).values({
				category: 'SHIP_REVIEW',
				userId: locals.user!.id,
				data: {
					shipId,
					approved: true,
					org: locals.user!.roles.includes('ORGANIZER'),
					multiplier: payoutMult,
				},
			}),
		]);

		// sendUpdatedBalance(userId, ),
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
			db.insert(auditLogs).values({
				category: 'SHIP_REVIEW',
				userId: locals.user!.id,
				data: { shipId, undone: true, previousStatus: ship.status },
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
