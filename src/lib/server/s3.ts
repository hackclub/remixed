import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

function getClient(): S3Client {
	if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
		throw new Error('S3 environment variables are not configured');
	}
	return new S3Client({
		region: 'auto',
		endpoint: env.S3_ENDPOINT,
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID,
			secretAccessKey: env.S3_SECRET_ACCESS_KEY,
		},
	});
}

export async function uploadToS3(
	key: string,
	body: Uint8Array,
	contentType: string,
): Promise<void> {
	const client = getClient();
	await client.send(
		new PutObjectCommand({
			Bucket: env.S3_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export function getPublicUrl(key: string): string {
	return `${env.S3_PUBLIC_URL}/${key}`;
}
