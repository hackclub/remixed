import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { encrypt } from '$lib/server/crypto';
import { eq } from 'drizzle-orm';
import {
	consumeOauthState,
	exchangeHackatimeCode,
	fetchHackatimeProfile,
	fetchSlackIdentity,
	hackatimeCallbackUrl,
} from '$lib/server/auth';
import { isRedirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/?error=hackatime_requires_hca');
	}

	if (url.searchParams.get('error')) {
		throw redirect(303, '/auth/hackatime?error=hackatime_denied');
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(303, '/auth/hackatime?error=hackatime_failed');
	}

	if (!consumeOauthState(cookies, url, 'hackatime', url.searchParams.get('state'))) {
		throw redirect(303, '/auth/hackatime?error=hackatime_state');
	}

	try {
		const accessToken = await exchangeHackatimeCode(code, hackatimeCallbackUrl(url));
		const hackatimeInfo = await fetchHackatimeProfile(accessToken);

		if (!hackatimeInfo.slack_id || hackatimeInfo.slack_id !== locals.user.slackId) {
			throw redirect(303, '/auth/hackatime?error=hackatime_mismatch');
		}

		const slackIdentity = await fetchSlackIdentity(
			locals.user.slackId,
			locals.user.username,
			locals.user.avatarUrl,
		);

		await db
			.update(users)
			.set({
				username: slackIdentity.username,
				avatarUrl: slackIdentity.avatarUrl,
				accessToken: encrypt(accessToken),
			})
			.where(eq(users.id, locals.user.id));

		throw redirect(303, '/projects');
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		console.error('Hackatime callback failed', error);
		throw redirect(303, '/auth/hackatime?error=hackatime_failed');
	}
};
