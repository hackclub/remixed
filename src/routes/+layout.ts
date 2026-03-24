import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

export const load = async () => {
	if (browser && env.PUBLIC_POSTHOG_PROJECT_KEY) {
		posthog.init(env.PUBLIC_POSTHOG_PROJECT_KEY, {
			api_host: 'https://us.i.posthog.com',
			defaults: '2026-01-30',
		});
	}

	return;
};
