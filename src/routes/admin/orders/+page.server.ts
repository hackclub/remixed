import { db } from '$lib/server/db';
import { orders, shopItems, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ url }) => {
	const statusFilter = (url.searchParams.get('status') ?? 'PENDING') as 'PENDING' | 'FULFILLED';
	const itemOrders = await db
		.select({ order: orders, item: shopItems, user: users })
		.from(orders)
		.innerJoin(shopItems, eq(shopItems.id, orders.itemId))
		.innerJoin(users, eq(users.id, orders.userId))
		.where(eq(orders.status, statusFilter))
		.orderBy(orders.id);
	const decryptedOrders = itemOrders.map((row) => ({
		...row,
		order: {
			...row.order,
			country: decrypt(row.order.country),
		},
	}));
	return { orders: decryptedOrders };
};

export const actions: Actions = {
	completeOrder: async ({ request }) => {
		const data = await request.formData();
		const orderId = Number(data.get('orderId'));
		await db.update(orders).set({ status: 'FULFILLED' }).where(eq(orders.id, orderId));
	},
};
