import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const AUTH_ERRORS: Record<string, string> = {
	hca_denied: 'Hack Club Auth did not complete. Try again to continue.',
	hca_state: 'The Hack Club Auth session expired. Start the sign-in flow again.',
	hca_missing_slack: 'Hack Club Auth did not return a Slack ID for this account.',
	hca_failed: 'Hack Club Auth failed. Try again in a moment.',
	hackatime_requires_hca: 'Sign in with Hack Club Auth before connecting Hackatime.',
};

export const load: PageServerLoad = ({ url, cookies, locals }) => {
	const ref = url.searchParams.get('ref');
	if (ref) {
		cookies.set('ref', ref, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
	}

	if (locals.user?.accessToken) {
		throw redirect(307, '/projects');
	}

	if (locals.user) {
		throw redirect(307, '/auth/hackatime');
	}

	return { authError: AUTH_ERRORS[url.searchParams.get('error') ?? ''] ?? null };
};
