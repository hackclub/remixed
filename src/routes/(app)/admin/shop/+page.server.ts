import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { deletedShopItems, orders, shopItems, users } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { sendShopMessage } from '$lib/server/slack/shop_message';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const [items, archivedItems, allUsers] = await Promise.all([
		db.select().from(shopItems).orderBy(shopItems.id),
		db.select().from(deletedShopItems).orderBy(deletedShopItems.originalId),
		db.select({ id: users.id, username: users.username }).from(users),
	]);

	const usernameById = new Map(allUsers.map((user) => [user.id, user.username]));

	return {
		items,
		deletedItems: archivedItems.map((item) => ({
			item,
			deletedByUsername: usernameById.get(item.deletedByUserId) ?? `User #${item.deletedByUserId}`,
		})),
	};
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
		let newItem!: typeof shopItems.$inferSelect;

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
		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHOP_ITEM',
			entityType: 'shop_item',
			entityId: newItem.id,
			changeType: id === -1 ? 'create' : 'update',
			data: {
				before: prevItem ?? null,
				after: newItem,
			},
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

		const deletedAt = new Date();

		await db.transaction(async (tx) => {
			await tx.insert(deletedShopItems).values({
				originalId: item.id,
				name: item.name,
				description: item.description,
				cost: item.cost,
				imageUrl: item.imageUrl,
				deletedAt,
				deletedByUserId: locals.user!.id,
			});
			await tx.delete(shopItems).where(eq(shopItems.id, itemId));
			await recordAuditLog(tx, {
				actorUserId: locals.user!.id,
				category: 'SHOP_ITEM',
				entityType: 'shop_item',
				entityId: itemId,
				changeType: 'soft_delete',
				data: { item },
			});
		});

		await sendShopMessage(item, null);
	},
};
