import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hcaAuthorizeUrl, issueOauthState } from '$lib/server/auth';

export const GET: RequestHandler = async ({ cookies, url, locals }) => {
	if (locals.user?.accessToken) {
		throw redirect(303, '/projects');
	}

	if (locals.user) {
		throw redirect(303, '/auth/hackatime');
	}

	const state = issueOauthState(cookies, url, 'hca');
	throw redirect(303, hcaAuthorizeUrl(url, state));
};
