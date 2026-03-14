import { decrypt } from '$lib/server/crypto';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const projectId = Number(url.searchParams.get('id'));
	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));

	let hackatimeSeconds: null | number = null;
	if (project.hackatimeProjects.length != 0) {
		const hackatimeUrl =
			'https://hackatime.hackclub.com/api/v1/authenticated/projects?' +
			new URLSearchParams({ start: '2026-03-07', projects: project.hackatimeProjects.join(',') });
		hackatimeSeconds = await fetch(hackatimeUrl, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		})
			.then((r) => r.json())
			.then((resp) =>
				resp.projects
					.map((proj: any) => proj.total_seconds)
					.reduce((a: number, b: number) => a + b, 0),
			);
	}

	await db.update(projects).set({ hackatimeSeconds }).where(eq(projects.id, projectId));
	return new Response(hackatimeSeconds?.toString());
};
