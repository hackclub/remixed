import { env } from '$env/dynamic/private';
import { sendMessage } from './send_message';

export async function sendShopMessage(previousItem: any | null, newItem: any | null) {
	let message = '';
	if (previousItem == null && newItem != null) {
		message += `*<https://remixed.hackclub.com/shop/${newItem.id}|New Item> Added!*\n`;
		message += `Name: _${newItem.name}_\n`;
		message += `Description: _${nullText(newItem.description)}_\n`;
		message += `Cost: _${newItem.cost}_\n`;
		message += `Image: ${valueText(newItem.imageUrl).length > 0 ? formatImage(newItem.imageUrl, 'Link') : 'None'}\n`;
	} else if (previousItem != null && newItem == null) {
		message += '*Shop Item Deleted!*\n';
		message += `ID: _${previousItem.id}_\n`;
		message += `Name: _${previousItem.name}_\n`;
		message += `Description: _${nullText(previousItem.description)}_\n`;
		message += `Cost: _${previousItem.cost}_\n`;
		message += `Image: _${nullImage(previousItem.imageUrl, 'Previous')}_\n`;
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
	await sendMessage(env.SHOP_UPDATES_CHANNEL_ID, message);
	return;
}

function valueText(text: string | null | undefined): string {
	return String(text ?? '').trim();
}

function nullText(text: string | null | undefined): string {
	const value = valueText(text);
	return `${value.length > 0 ? value : '*None*'}`;
}

function nullImage(url: string | null | undefined, text: string): string {
	const value = valueText(url);
	return `${value.length > 0 ? formatImage(value, text) : '*None*'}`;
}

function formatImage(url: string, text: string): string {
	return `<${url}|${text}>`;
}
