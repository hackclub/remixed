import { db } from '$lib/server/db';
import { notesLedger, orders, shopItems, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { encrypt } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals, params }) => {
	const itemId = Number(params.id);
	const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
	console.log(item);
	return { item, balance: locals.user?.notesBalance };
};

export const actions: Actions = {
	placeOrder: async ({ locals, params, request }) => {
		const itemId = Number(params.id);
		const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
		if (locals.user!.notesBalance < item.cost) return fail(400, { error: 'Too Expensive' });

		const data = await request.formData();
		const userId = locals.user!.id;
		const addressLine1 = encrypt((data.get('addressLine1') as string).trim());
		const addressLine2 =
			(data.get('addressLine2') as string).trim().length > 0
				? encrypt((data.get('addressLine2') as string).trim())
				: null;
		const zipCode = encrypt((data.get('zipCode') as string).trim());
		const city = encrypt((data.get('city') as string).trim());
		const state = encrypt((data.get('state') as string).trim());
		const country = encrypt((data.get('country') as string).trim());
		const email = encrypt((data.get('email') as string).trim());
		const fullName = encrypt((data.get('fullName') as string).trim());

		const [orderInfo] = await db
			.insert(orders)
			.values({
				userId,
				itemId,
				fullName,
				email,
				addressLine1,
				addressLine2,
				city,
				state,
				country,
				zipCode,
			})
			.returning();
		await Promise.all([
			db
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} - ${item.cost}` })
				.where(eq(users.id, userId)),
			db
				.insert(notesLedger)
				.values({ userId, delta: -item.cost, reason: 'purchase_item', refId: orderInfo.id }),
		]);
	},
};
