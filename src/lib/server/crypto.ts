import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { env } from '$env/dynamic/private';

// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function getEncryptionKey() {
	if (!env.ENCRYPTION_KEY) {
		throw new Error('ENCRYPTION_KEY is required');
	}

	return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

function getSessionSecret() {
	if (!env.SESSION_SECRET) {
		throw new Error('SESSION_SECRET is required');
	}

	return env.SESSION_SECRET;
}

export function encrypt(plaintext: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
	const [ivHex, tagHex, encryptedHex] = ciphertext.split(':');
	const iv = Buffer.from(ivHex, 'hex');
	const tag = Buffer.from(tagHex, 'hex');
	const encrypted = Buffer.from(encryptedHex, 'hex');
	const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
	decipher.setAuthTag(tag);
	return decipher.update(encrypted) + decipher.final('utf8');
}

export function signSession(text: string): string {
	const signature = createHmac('sha256', getSessionSecret()).update(text).digest('hex');
	return signature;
}
