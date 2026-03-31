import { env } from '$env/dynamic/private';

type SlackMessageResponse = {
	ok: boolean;
	ts?: string;
	channel?: string;
};

export async function sendMessage(
	slackId: string,
	message: string,
): Promise<SlackMessageResponse> {
	const resp = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		body: JSON.stringify({ channel: slackId, text: message }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
	return resp.json();
}

export async function editMessage(
	channel: string,
	ts: string,
	message: string,
): Promise<SlackMessageResponse> {
	const resp = await fetch('https://slack.com/api/chat.update', {
		method: 'POST',
		body: JSON.stringify({ channel, ts, text: message }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
	return resp.json();
}
