import { decrypt } from '$lib/server/crypto';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { notesLedger, projects, ships, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { ShipStatusPub } from '$lib';

export const load: PageServerLoad = async ({ locals, url }) => {
	const accessToken = decrypt(locals.user!.accessToken);

	const status = (url.searchParams.get('status') ?? 'PENDING') as ShipStatusPub;

	const projectShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, status))
		.orderBy(ships.id);
	console.log(projectShips);
	return {
		ships: projectShips
	};
};

export const actions: Actions = {
	reject: async ({ request }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		await db.update(ships).set({ status: 'REJECTED' }).where(eq(ships.id, shipId));
	},
	approve: async ({ request }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const userId = Number(data.get('userId'));
		const payout = Number(data.get('payout'));

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
