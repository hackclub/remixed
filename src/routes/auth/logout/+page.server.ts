import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	cookies.delete('session_token', { path: '/' });
	redirect(302, '/');
};
export const prerender = false;
