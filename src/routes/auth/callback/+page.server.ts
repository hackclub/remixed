import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { env as senv } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { encrypt } from '$lib/server/crypto';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const tokenReq = await fetch('https://hackatime.hackclub.com/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID,
			client_secret: senv.HACKATIME_OAUTH_SECRET,
			code: url.searchParams.get('code')!,
			redirect_uri: env.PUBLIC_CALLBACK_URL!,
			grant_type: 'authorization_code',
		}).toString(),
	});
	const { access_token } = await tokenReq.json();

	const hackatimeInfo = await fetch('https://hackatime.hackclub.com/api/v1/authenticated/me', {
		headers: { Authorization: `Bearer ${access_token}` },
	}).then((r) => r.json());

	const slackProfile = await fetch('https://slack.com/api/users.profile.get', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			token: senv.SLACK_BOT_USER_OAUTH_TOKEN,
			user: hackatimeInfo.slack_id,
		}),
	}).then((r) => r.json());

	const slackId = hackatimeInfo.slack_id;
	const username = slackProfile.profile.display_name;
	const avatarUrl = slackProfile.profile?.image_1024 || null;

	const [existingUser] = await db.select().from(users).where(eq(users.slackId, slackId));

	const [user] = await db
		.insert(users)
		.values({ slackId, username, avatarUrl, accessToken: encrypt(access_token) })
		.onConflictDoUpdate({
			target: users.slackId,
			set: { username, avatarUrl, accessToken: encrypt(access_token) },
		})
		.returning({ id: users.id });

	const referrerId = Number(cookies.get('ref'));
	if (!existingUser && referrerId) {
		if (referrerId != user.id) {
			await db
				.update(users)
				.set({ referrals: sql`${users.referrals} + 1` })
				.where(eq(users.id, referrerId));
		}
	}

	cookies.delete('ref', { path: '/' });
	cookies.set('session_user_id', String(user.id), { path: '/' });
	redirect(307, '/dashboard');
};
