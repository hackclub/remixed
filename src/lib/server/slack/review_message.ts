import { sendMessage, editMessage } from './send_message';

type ReviewDMResult = { ts?: string; channel?: string };

export async function sendReviewDM(
	slackId: string,
	projectName: string,
	type: 'approved' | 'rejected' | 'comment',
	userComment: string,
): Promise<ReviewDMResult> {
	let message: string;
	if (type === 'approved') {
		message = `Your project *${projectName}* has been approved!\n\n_${userComment}_`;
	} else if (type === 'rejected') {
		message = `Your project *${projectName}* has been rejected.\n\n_${userComment}_`;
	} else {
		message = `New comment on your project *${projectName}*:\n\n_${userComment}_`;
	}
	const resp = await sendMessage(slackId, message);
	return { ts: resp.ts, channel: resp.channel };
}

export async function editReviewDM(
	channel: string,
	ts: string,
	projectName: string,
	type: 'approved' | 'rejected' | 'comment',
	userComment: string,
): Promise<void> {
	let message: string;
	if (type === 'approved') {
		message = `Your project *${projectName}* has been approved!\n\n_${userComment}_`;
	} else if (type === 'rejected') {
		message = `Your project *${projectName}* has been rejected.\n\n_${userComment}_`;
	} else {
		message = `New comment on your project *${projectName}*:\n\n_${userComment}_`;
	}
	await editMessage(channel, ts, message);
}
