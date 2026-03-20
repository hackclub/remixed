import { env } from '$env/dynamic/private';

export async function sendMessage(slackId: string, message: string) {
	const resp = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		body: JSON.stringify({ channel: slackId, text: message }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
}
