import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { clearOauthStateCookies } from '$lib/server/auth';

export const load: PageServerLoad = async ({ cookies, url }) => {
	clearOauthStateCookies(cookies, url);
	cookies.delete('session_token', { path: '/' });
	throw redirect(302, '/');
};
export const prerender = false;
