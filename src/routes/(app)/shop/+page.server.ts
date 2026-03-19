import { db } from '$lib/server/db';
import { shopItems } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const items = await db.select().from(shopItems);
	return { items, balance: locals.user?.notesBalance };
};
