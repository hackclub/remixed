import { sendMessage, editMessage } from './send_message';
import { env } from '$env/dynamic/private';

type ReviewDMResult = { ts?: string; channel?: string };

function projectLink(projectName: string, projectId: number): string {
	const baseUrl = env.BASE_URL || 'https://remixed.hackclub.com';
	return `<${baseUrl}/projects/${projectId}|${projectName}>`;
}

export async function sendReviewDM(
	slackId: string,
	projectName: string,
	projectId: number,
	type: 'approved' | 'rejected' | 'comment',
	userComment: string,
): Promise<ReviewDMResult> {
	const link = projectLink(projectName, projectId);
	let message: string;
	if (type === 'approved') {
		message = `Your project ${link} has been approved!\n\n_${userComment}_`;
	} else if (type === 'rejected') {
		message = `Your project ${link} has been rejected.\n\n_${userComment}_`;
	} else {
		message = `New comment on your project ${link}:\n\n_${userComment}_`;
	}
	const resp = await sendMessage(slackId, message);
	return { ts: resp.ts, channel: resp.channel };
}

export async function editReviewDM(
	channel: string,
	ts: string,
	projectName: string,
	projectId: number,
	type: 'approved' | 'rejected' | 'comment',
	userComment: string,
): Promise<void> {
	const link = projectLink(projectName, projectId);
	let message: string;
	if (type === 'approved') {
		message = `Your project ${link} has been approved!\n\n_${userComment}_`;
	} else if (type === 'rejected') {
		message = `Your project ${link} has been rejected.\n\n_${userComment}_`;
	} else {
		message = `New comment on your project ${link}:\n\n_${userComment}_`;
	}
	await editMessage(channel, ts, message);
}
