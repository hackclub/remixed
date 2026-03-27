import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { signSession } from '$lib/server/crypto';
import type { RoleEnumPub } from '$lib';

const PROTECTED: { [key in RoleEnumPub]: string[] } = {
	USER: ['/projects', '/api/me', '/api/ship', '/api/project_time'],
	STAFF: [],
	REVIEWER: ['/admin/ships', '/admin/review'],
	ORGANIZER: [
		'/admin/users',
		'/admin/shop',
		'/admin/orders',
		'/admin/projects',
		'/admin/audit',
		'/api/admin/order_info',
	],
	HQ: ['/admin/hq', '/admin/ships'],
};

const HACKATIME_REQUIRED = ['/projects', '/api/hackatime', '/api/project_time', '/api/ship'];

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session_token');
	const userId = sessionToken ? verifySessionToken(sessionToken) : null;

	if (userId) {
		const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
		if (!user) throw redirect(303, '/');
		event.locals.user = user;
	} else {
		event.locals.user = null;
	}

	if (HACKATIME_REQUIRED.some((p) => event.url.pathname.startsWith(p))) {
		if (!event.locals.user) {
			throw redirect(303, '/');
		}

		if (!event.locals.user.accessToken) {
			throw redirect(303, '/auth/hackatime');
		}
	}

	for (const requiredRole in PROTECTED) {
		if (PROTECTED[requiredRole as RoleEnumPub].some((p) => event.url.pathname.startsWith(p))) {
			if (!event.locals.user?.roles.includes(requiredRole as RoleEnumPub)) {
				throw redirect(303, '/');
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
