import { env } from '$env/dynamic/private';

type SlackMessageResponse = {
	ok: boolean;
	ts?: string;
	channel?: string;
};

function isMessagingDisabled(): boolean {
	return env.DISABLE_SLACK_MESSAGES === 'true' || !env.SLACK_BOT_USER_OAUTH_TOKEN;
}

export async function sendMessage(
	slackId: string | undefined,
	message: string,
): Promise<SlackMessageResponse> {
	if (!slackId) {
		return { ok: false };
	}
	if (isMessagingDisabled()) {
		console.warn(`Slack messaging disabled, would send to ${slackId}: ${message}`);
		return { ok: true };
	}
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
	if (isMessagingDisabled()) {
		console.warn(`Slack messaging disabled, would edit ${channel}/${ts}: ${message}`);
		return { ok: true };
	}
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

export async function deleteMessage(
	channel: string,
	ts: string,
): Promise<SlackMessageResponse> {
	if (isMessagingDisabled()) {
		console.warn(`Slack messaging disabled, would delete ${channel}/${ts}`);
		return { ok: true };
	}
	const resp = await fetch('https://slack.com/api/chat.delete', {
		method: 'POST',
		body: JSON.stringify({ channel, ts }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
	return resp.json();
}

export async function openDmChannel(slackId: string): Promise<string | null> {
	if (isMessagingDisabled()) return null;
	const resp = await fetch('https://slack.com/api/conversations.open', {
		method: 'POST',
		body: JSON.stringify({ users: slackId }),
		headers: {
			'Content-type': 'application/json; charset=utf-8',
			Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}`,
		},
	});
	const data = await resp.json();
	return data.ok ? data.channel?.id ?? null : null;
}

export async function findAndDeleteMessages(
	slackId: string,
	matchers: ((text: string) => boolean)[],
): Promise<number> {
	const channelId = await openDmChannel(slackId);
	if (!channelId) return 0;

	const resp = await fetch(
		`https://slack.com/api/conversations.history?channel=${channelId}&limit=50`,
		{
			headers: { Authorization: `Bearer ${env.SLACK_BOT_USER_OAUTH_TOKEN}` },
		},
	);
	const data = await resp.json();
	if (!data.ok || !data.messages) return 0;

	let deleted = 0;
	for (const msg of data.messages) {
		if (!msg.text || msg.subtype) continue;
		if (matchers.some((m) => m(msg.text))) {
			await deleteMessage(channelId, msg.ts);
			deleted++;
		}
	}
	return deleted;
}
