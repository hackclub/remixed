import { db } from '$lib/server/db';
import { auditLogs, shopItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db.select().from(shopItems);
	console.log(items);
	return { items };
};

export const actions: Actions = {
	updateItem: async ({ locals, request }) => {
		const data = await request.formData();
		console.log(data);

		let id = Number(data.get('itemId'));
		const name = (data.get('name') as string).trim();
		const description = (data.get('description') as string).trim();
		const cost = Number(data.get('cost'));
		const imageUrl = (data.get('imageUrl') as string).trim();
		let newItem = {};

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
		await db
			.insert(auditLogs)
			.values({
				category: 'SHOP_ITEM',
				userId: locals.user!.id,
				data: { item: newItem, update: id != -1 },
			});
	},
};
