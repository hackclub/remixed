import { env } from '$env/dynamic/private';
import { sendMessage } from './send_message';

export async function sendCertMessage(
	slackId: string,
	projectName: string,
	approved: boolean,
	feedback: string,
) {
	const message = `Your project *${projectName}* got ${approved ? 'APPROVED' : 'REJECTED'} with the following reason:

_${feedback}_`;
	sendMessage(slackId, message);
}
