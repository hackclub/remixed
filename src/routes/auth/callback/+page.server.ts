import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { env as senv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const tokenReq = await fetch('https://hackatime.hackclub.com/oauth/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.PUBLIC_HACKATIME_OAUTH_UID,
			client_secret: senv.HACKATIME_OAUTH_SECRET,
			code: url.searchParams.get('code') as string,
			redirect_uri: env.PUBLIC_CALLBACK_URL as string,
			grant_type: 'authorization_code'
		}).toString()
	});
	const tokenResp = await tokenReq.json();
	cookies.set('access_token', tokenResp.access_token, { path: '/' });
	redirect(307, '/dashboard');
};
