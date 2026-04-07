import { decrypt } from '$lib/server/crypto';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';
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
	let hackatimeSeconds: null | number = null;
	if (project.hackatimeProjects.length != 0) {
		const query = new URLSearchParams();
		if (env.HACKATIME_START_DATE) {
			query.set('start', env.HACKATIME_START_DATE);
		}
		const today = new Date().toISOString().split('T')[0];
		query.set('end', today);

		const hackatimeUrl =
			'https://hackatime.hackclub.com/api/summary?' + query.toString();
		const resp = await fetch(hackatimeUrl, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}).then((r) => r.json());

		const targetProjects = new Set(project.hackatimeProjects);
		hackatimeSeconds = (resp.projects ?? [])
			.filter((p: any) => targetProjects.has(p.name))
			.map((p: any) => p.total_seconds)
			.reduce((a: number, b: number) => a + b, 0);
	}

	await db.update(projects).set({ hackatimeSeconds }).where(eq(projects.id, projectId));
	return new Response(hackatimeSeconds?.toString());
};
