import { decrypt } from '$lib/server/crypto';
import { getProjects } from '$lib/server/hackatimeProjects';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const projects = await getProjects(locals.user.id, accessToken);

	return new Response(JSON.stringify(projects));
};
