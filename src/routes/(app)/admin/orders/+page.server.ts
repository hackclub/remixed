import { db } from '$lib/server/db';
import { auditLogs, orders, shopItems, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';

async function getOrdersByStatus(status: 'PENDING' | 'FULFILLED') {
	const itemOrders = await db
		.select({ order: orders, item: shopItems, user: users })
		.from(orders)
		.innerJoin(shopItems, eq(shopItems.id, orders.itemId))
		.innerJoin(users, eq(users.id, orders.userId))
		.where(eq(orders.status, status))
		.orderBy(orders.id);
	return itemOrders.map((row) => ({
		...row,
		order: {
			...row.order,
			country: decrypt(row.order.country),
		},
	}));
}

export const load: PageServerLoad = async () => {
	const [pendingOrders, fulfilledOrders] = await Promise.all([
		getOrdersByStatus('PENDING'),
		getOrdersByStatus('FULFILLED'),
	]);
	return { pendingOrders, fulfilledOrders };
};

export const actions: Actions = {
	completeOrder: async ({ request, locals }) => {
		const data = await request.formData();
		const orderId = Number(data.get('orderId'));
		await db.update(orders).set({ status: 'FULFILLED' }).where(eq(orders.id, orderId));
		await db
			.insert(auditLogs)
			.values({ category: 'FULFILL', userId: locals.user!.id, data: { orderId, fulfilled: true } });
	},
	reopenOrder: async ({ request, locals }) => {
		const data = await request.formData();
		const orderId = Number(data.get('orderId'));
		await db.update(orders).set({ status: 'PENDING' }).where(eq(orders.id, orderId));
		await db.insert(auditLogs).values({
			category: 'FULFILL',
			userId: locals.user!.id,
			data: { orderId, fulfilled: false },
		});
	},
};
