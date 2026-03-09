import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('session_user_id');

	if (userId) {
		const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
		event.locals.user = user ?? null;
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};
