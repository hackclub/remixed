import { db } from '$lib/server/db';
import { auditLogs, orders, shopItems } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { sendShopMessage } from '$lib/server/slack/shop_message';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db.select().from(shopItems).orderBy(shopItems.id);
	return { items };
};

export const actions: Actions = {
	updateItem: async ({ locals, request }) => {
		const data = await request.formData();

		let id = Number(data.get('itemId'));
		const name = (data.get('name') as string).trim();
		const description = (data.get('description') as string).trim();
		const cost = Number(data.get('cost'));
		const imageUrl = (data.get('imageUrl') as string).trim();
		const [prevItem] = (await db.select().from(shopItems).where(eq(shopItems.id, id))) ?? null;
		let newItem = {};

		if (id !== -1 && !prevItem) {
			return fail(404, { error: 'Shop item not found' });
		}

		if (id == -1) {
			[newItem] = await db
				.insert(shopItems)
				.values({ name, description, cost, imageUrl })
				.returning();
		} else {
			[newItem] = await db
				.update(shopItems)
				.set({ name, description, cost, imageUrl })
				.where(eq(shopItems.id, id))
				.returning();
		}
		await sendShopMessage(prevItem, newItem);
		await db.insert(auditLogs).values({
			category: 'SHOP_ITEM',
			userId: locals.user!.id,
			data: { item: newItem, update: id != -1 },
		});
	},
	deleteItem: async ({ locals, request }) => {
		const data = await request.formData();
		const itemId = Number(data.get('itemId'));

		if (!itemId) {
			return fail(400, { error: 'Invalid shop item' });
		}

		const [[item], [orderCount]] = await Promise.all([
			db.select().from(shopItems).where(eq(shopItems.id, itemId)),
			db.select({ value: count() }).from(orders).where(eq(orders.itemId, itemId)),
		]);

		if (!item) {
			return fail(404, { error: 'Shop item not found' });
		}

		if (orderCount.value > 0) {
			return fail(400, { error: 'Cannot delete an item with existing orders' });
		}

		await db.delete(shopItems).where(eq(shopItems.id, itemId));
		await sendShopMessage(item, null);
		await db.insert(auditLogs).values({
			category: 'SHOP_ITEM',
			userId: locals.user!.id,
			data: { item, delete: true },
		});
	},
};
