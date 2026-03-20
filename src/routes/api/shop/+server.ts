import { db } from '$lib/server/db';
import { shopItems } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const items = await db.select().from(shopItems).orderBy(shopItems.id);
	return new Response(JSON.stringify(items));
};
