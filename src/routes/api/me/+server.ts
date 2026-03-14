import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });

	const slackProfile = await fetch('https://slack.com/api/users.profile.get', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			token: env.SLACK_BOT_USER_OAUTH_TOKEN,
			user: locals.user.slackId!,
		}),
	}).then((r) => r.json());

	return new Response(JSON.stringify(slackProfile.profile));
};
