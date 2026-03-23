import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { env as senv } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createHmac } from 'crypto';
import { signSession } from '$lib/server/crypto';
import type { RoleEnumPub } from '$lib';

const PROTECTED: { [key in RoleEnumPub]: string[] } = {
	USER: ['/projects', '/api/me', '/api/ship', '/api/project_time'],
	STAFF: [],
	REVIEWER: ['/admin/ships'],
	ORGANIZER: [
		'/admin/users',
		'/admin/shop',
		'/admin/orders',
		'/admin/projects',
		'/api/admin/order_info',
	],
};

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session_token');
	const userId = sessionToken ? verifySessionToken(sessionToken) : null;

	if (userId) {
		const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
		if (!user) redirect(303, '/');
		event.locals.user = user;
	} else {
		event.locals.user = null;
	}

	for (const requiredRole in PROTECTED) {
		if (PROTECTED[requiredRole as RoleEnumPub].some((p) => event.url.pathname.startsWith(p))) {
			if (!event.locals.user?.roles.includes(requiredRole as RoleEnumPub)) {
				redirect(303, '/');
			}
		}
	}

	return resolve(event);
};

function verifySessionToken(token: string): number | null {
	const [userId, signature] = token.split('.');
	if (!userId || !signature) return null;

	const expectedSignature = signSession(userId);
	if (signature != expectedSignature) return null;

	return Number(userId);
}
