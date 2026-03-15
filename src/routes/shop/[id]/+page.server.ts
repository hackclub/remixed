import { db } from '$lib/server/db';
import { shopItems } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const itemId = Number(params.id);
	const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
	console.log(item);
	return { item, balance: locals.user?.notesBalance };
};
