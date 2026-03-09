import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('session_user_id');
	if (!userId) return new Response('Unauthorized', { status: 401 });

	const user = await db.query.users.findFirst({ where: eq(users.id, Number(userId)) });
	if (!user) return new Response('Unauthorized', { status: 401 });

	const slackProfile = await fetch('https://slack.com/api/users.profile.get', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			token: env.SLACK_BOT_USER_OAUTH_TOKEN,
			user: user.slackId
		})
	}).then((r) => r.json());

	return new Response(JSON.stringify(slackProfile.profile));
};
