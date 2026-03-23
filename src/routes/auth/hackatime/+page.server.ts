import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const HACKATIME_ERRORS: Record<string, string> = {
	hackatime_denied: 'Hackatime did not complete. Connect it to finish setting up your account.',
	hackatime_state: 'The Hackatime session expired. Start the connection flow again.',
	hackatime_mismatch:
		'That Hackatime account does not match the Slack account from Hack Club Auth.',
	hackatime_failed: 'Hackatime failed to connect. Try again in a moment.',
};

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/');
	}

	if (locals.user.accessToken) {
		throw redirect(303, '/projects');
	}

	return {
		errorMessage: HACKATIME_ERRORS[url.searchParams.get('error') ?? ''] ?? null,
	};
};
