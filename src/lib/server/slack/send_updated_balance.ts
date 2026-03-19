import { env } from '$env/dynamic/private';
import { sendMessage } from './send_message';

export async function sendUpdatedBalance(slackId: string, oldBal: number, newBal: number) {
	const delta = newBal - oldBal;
	let message = '';
	if (delta > 0) {
		message = `You recieved *${delta}* notes!
Your new balance is *${newBal}* notes!
_(${oldBal} + ${delta} = ${newBal})_`;
	}
	sendMessage(slackId, message);
}
