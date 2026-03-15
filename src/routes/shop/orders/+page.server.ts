import { db } from '$lib/server/db';
import { orders, shopItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const userOrders = await db
		.select({ order: orders, item: shopItems })
		.from(orders)
		.innerJoin(shopItems, eq(shopItems.id, orders.itemId))
		.where(eq(orders.userId, userId));
	return { orders: userOrders };
};
