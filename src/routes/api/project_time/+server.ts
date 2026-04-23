import { decrypt } from '$lib/server/crypto';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { HackatimeClient } from '$lib/server/hackatime';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const projectId = Number(url.searchParams.get('id'));
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project || project.userId != locals.user!.id)
		return new Response('Forbidden', { status: 403 });
	if (!locals.user?.accessToken) {
		return new Response('Hackatime not connected', { status: 409 });
	}

	const accessToken = decrypt(locals.user!.accessToken);
	const hackatime = new HackatimeClient(accessToken);
	let hackatimeSeconds: null | number = null;
	if (project.hackatimeProjects.length != 0) {
		const { projects: hackatimeProjects } = await hackatime.getProjects({
			start: '2026-03-07',
			projects: project.hackatimeProjects.join(','),
		});

		hackatimeSeconds = hackatimeProjects.map((p) => p.total_seconds).reduce((a, b) => a + b, 0);
	}

	await db.update(projects).set({ hackatimeSeconds }).where(eq(projects.id, projectId));
	return new Response(hackatimeSeconds?.toString());
};
