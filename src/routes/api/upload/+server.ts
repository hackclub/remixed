import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { uploadToS3, getPublicUrl } from '$lib/server/s3';
import { env } from '$env/dynamic/private';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
const EXT_MAP: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/avif': 'avif',
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_PUBLIC_URL) {
		error(503, 'File storage is not configured');
	}

	const projectIdStr = request.headers.get('x-project-id');
	const projectId = Number(projectIdStr);
	if (!Number.isFinite(projectId) || projectId <= 0) {
		error(400, 'Missing or invalid x-project-id header');
	}

	const [project] = await db
		.select({ userId: projects.userId })
		.from(projects)
		.where(eq(projects.id, projectId));

	if (!project) error(404, 'Project not found');
	if (project.userId !== locals.user.id) error(403, 'Forbidden');

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) error(400, 'Missing file field');
	if (!ALLOWED_TYPES.includes(file.type)) error(400, 'Invalid file type — must be an image');
	if (file.size > MAX_FILE_SIZE) error(400, 'File too large — maximum 5 MB');

	const ext = EXT_MAP[file.type] ?? 'bin';
	const key = `screenshots/${projectId}-${Date.now()}.${ext}`;
	const bytes = new Uint8Array(await file.arrayBuffer());

	await uploadToS3(key, bytes, file.type);

	const url = getPublicUrl(key);
	return json({ url });
};
