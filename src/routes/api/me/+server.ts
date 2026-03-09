import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const slackIdReq = await fetch('https://hackatime.hackclub.com/api/v1/authenticated/me', {
		headers: { Authorization: `Bearer ${cookies.get('access_token')}` }
	});
	const slackId = (await slackIdReq.json()).slack_id;

	const slackInfoReq = await fetch('https://slack.com/api/users.profile.get', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			token: env.SLACK_BOT_USER_OAUTH_TOKEN,
			user: slackId
		})
	});
	const slackInfo = await slackInfoReq.json();
	// console.log(slackInfo);
	// return new Response('SHIT');
	return new Response(JSON.stringify(slackInfo.profile));
};
