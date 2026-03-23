import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hackatimeAuthorizeUrl, issueOauthState } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies, url, locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/hca');
	}

	if (locals.user.accessToken) {
		throw redirect(303, '/projects');
	}

	const state = issueOauthState(cookies, url, 'hackatime');
	throw redirect(303, hackatimeAuthorizeUrl(url, state));
};
