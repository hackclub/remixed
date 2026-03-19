import { env } from '$env/dynamic/private';

export async function sendUpdatedBalance(slackId: string, oldBal: number, newBal: number) {
	const delta = newBal - oldBal;
	let message = '';
	if (delta > 0) {
		message = `You recieved *${delta}* notes!
Your new balance is *${newBal}* notes!
_(${oldBal} + ${delta} = ${newBal})_`;
	}
	const resp = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		body: JSON.stringify({ channel: slackId, text: message }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
	console.log(await resp.json());
}
