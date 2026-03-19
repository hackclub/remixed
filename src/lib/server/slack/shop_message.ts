import { env } from '$env/dynamic/private';
import { sendMessage } from './send_message';

export async function sendShopMessage(previousItem: any, newItem: any) {
	let message = '';
	console.log(previousItem, newItem);
	if (previousItem == null) {
		message += '*<https://remixed.hackclub.com/shop/${newItem.id}|New Item> Added!*\n';
		message += `Name: _${newItem.name}_\n`;
		message += `Description: _${nullText(newItem.description)}_\n`;
		message += `Cost: _${newItem.cost}_\n`;
		message += `Image: ${newItem.imageUrl.trim().length > 0 ? formatImage(newItem.imageUrl, 'Link') : 'None'}\n`;
	} else {
		message += `*<https://remixed.hackclub.com/shop/${newItem.id}|Item> Updated!*\n`;
		if (newItem.name != previousItem.name) {
			message += `Name: _${previousItem.name} -> ${newItem.name}_\n`;
		} else {
			message += `Name: _${newItem.name}_\n`;
		}
		if (newItem.description != previousItem.description) {
			message += `Description: _${nullText(previousItem.description)} -> ${nullText(newItem.description)}_\n`;
		}
		if (newItem.cost != previousItem.cost) {
			message += `Cost: _${previousItem.cost} -> ${newItem.cost}_\n`;
		}
		if (newItem.imageUrl != previousItem.imageUrl) {
			message += `Image: _${nullImage(previousItem.imageUrl, 'Previous')} -> ${nullImage(newItem.imageUrl, 'New')}_\n`;
		}
	}
	console.log(message);
	await sendMessage(env.SHOP_UPDATES_CHANNEL_ID, message);
	return;
}

function nullText(text: string): string {
	return `${text.trim().length > 0 ? text : '*None*'}`;
}
function nullImage(url: string, text: string): string {
	return `${url.trim().length > 0 ? formatImage(url, text) : '*None*'}`;
}

function formatImage(url: string, text: string): string {
	return `<${url}|${text}>`;
}
