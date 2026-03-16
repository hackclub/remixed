import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { env as senv } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { createHmac } from 'crypto';
import { signSession } from '$lib/server/crypto';

const PROTECTED = ['/dashboard', '/projects', '/api/me', '/api/projects', '/api/ship'];

const ORG_ONLY = ['/admin/users', '/admin/shop', '/admin/orders', '/api/admin/order_info'];

export const handle: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get('session_token');
	const userId = sessionToken ? verifySessionToken(sessionToken) : null;

	if (userId) {
		const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
		event.locals.user = user ?? null;
	} else {
		event.locals.user = null;
	}

	const isProtected = PROTECTED.some((path) => event.url.pathname.startsWith(path));
	if (isProtected && !event.locals.user) redirect(303, '/');

	if (
		event.url.pathname.startsWith('/admin/ships') &&
		!event.locals.user?.roles.includes('REVIEWER')
	) {
		redirect(303, '/');
	}

	if (
		ORG_ONLY.some((p) => event.url.pathname.startsWith(p)) &&
		!event.locals.user?.roles.includes('ORGANIZER')
	) {
		redirect(303, '/');
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
