import { decrypt } from '$lib/server/crypto';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notesLedger, projects, ships, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { ShipStatusPub } from '$lib';

const payoutMults = {
	reviewer: [10.0, 15.0],
	organizer: [10.0, 25.0]
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const status = (url.searchParams.get('status') ?? 'PENDING') as ShipStatusPub;
	const [user] = await db.select().from(users).where(eq(users.id, locals.user!.id));

	const projectShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, status))
		.orderBy(ships.id);
	console.log(projectShips);
	return {
		ships: projectShips,
		roles: user.roles,
		payoutMults
	};
};

export const actions: Actions = {
	reject: async ({ request }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		await db.update(ships).set({ status: 'REJECTED' }).where(eq(ships.id, shipId));
	},
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		console.log(data);
		const shipId = Number(data.get('shipId'));
		const userId = Number(data.get('userId'));
		const payoutMult = Number(data.get('payoutMult'));
		const shipSeconds = Number(data.get('shipSeconds'));

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
			db.update(ships).set({ status: 'APPROVED' }).where(eq(ships.id, shipId)),
			db
				.insert(notesLedger)
				.values({ userId, delta: payout, reason: 'ship_approved', refId: shipId }),
			db
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} + ${payout}` })
				.where(eq(users.id, userId))
		]);
	}
};
