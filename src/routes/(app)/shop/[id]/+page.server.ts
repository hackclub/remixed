import { db } from '$lib/server/db';
import { notesLedger, orders, shopItems, users } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { decrypt, encrypt } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals, params }) => {
	const itemId = Number(params.id);
	const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));

	if (!item) {
		throw error(404, 'Shop item not found');
	}

	const user = locals.user;
	const address = user
		? {
				fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') || null,
				email: user.email ?? null,
				addressLine1: user.addressLine1 ? decrypt(user.addressLine1) : null,
				addressLine2: user.addressLine2 ? decrypt(user.addressLine2) : null,
				city: user.city ? decrypt(user.city) : null,
				state: user.state ? decrypt(user.state) : null,
				country: user.country ? decrypt(user.country) : null,
				zipCode: user.zipCode ? decrypt(user.zipCode) : null,
			}
		: null;

	return { item, balance: locals.user?.notesBalance, address };
};

export const actions: Actions = {
	placeOrder: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const itemId = Number(params.id);
		const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
		if (!item) {
			throw error(404, 'Shop item not found');
		}

		if (locals.user.notesBalance < item.cost) return fail(400, { error: 'Too Expensive' });

		const user = locals.user;

		if (!user.addressLine1 || !user.city || !user.state || !user.country || !user.zipCode) {
			return fail(400, { error: 'No shipping address on file' });
		}

		const userId = user.id;
		const fullName = encrypt([user.firstName, user.lastName].filter(Boolean).join(' '));
		const email = encrypt(user.email ?? '');

		const [orderInfo] = await db
			.insert(orders)
			.values({
				userId,
				itemId,
				fullName,
				email,
				addressLine1: user.addressLine1,
				addressLine2: user.addressLine2 ?? null,
				city: user.city,
				state: user.state,
				country: user.country,
				zipCode: user.zipCode,
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

		throw redirect(303, '/shop/orders');
	},
};
