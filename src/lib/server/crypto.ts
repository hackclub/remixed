import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');

export function encrypt(plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
	const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
	const iv = Buffer.from(ivHex, 'hex');
	const tag = Buffer.from(tagHex, 'hex');
	const encrypted = Buffer.from(encryptedHex, 'hex');
	const decipher = createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return decipher.update(encrypted) + decipher.final('utf8');
}

export function signSession(text: string): string {
	const signature = createHmac('sha256', env.SESSION_SECRET).update(text).digest('hex');
	return signature;
}
