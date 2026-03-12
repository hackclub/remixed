import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const PROTECTED = ['/dashboard', '/projects', '/api/me', '/api/projects', '/api/ship'];

export const handle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('session_user_id');

	if (userId) {
		const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
		event.locals.user = user ?? null;
	} else {
		event.locals.user = null;
	}

	const isProtected = PROTECTED.some((path) => event.url.pathname.startsWith(path));
	if (isProtected && !event.locals.user) redirect(303, '/');

	if (event.url.pathname.startsWith('/admin') && event.locals.user?.role == 'USER') {
		redirect(303, '/');
	}

	return resolve(event);
};
