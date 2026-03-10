import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const [project] = await db
		.select()
		.from(projects)
		.where(eq(Number(params.id), projects.id));
	let hackatimeSeconds: null | number = null;
	if (project.hackatimeProjects.length != 0) {
		const hackatimeUrl =
			'https://hackatime.hackclub.com/api/v1/authenticated/projects?' +
			new URLSearchParams({ start: '2026-03-07', projects: project.hackatimeProjects.join(',') });
		console.log(hackatimeUrl);
		hackatimeSeconds = await fetch(hackatimeUrl, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		})
			.then((r) => r.json())
			.then((resp) =>
				resp.projects
					.map((proj: any) => proj.total_seconds)
					.reduce((a: number, b: number) => a + b, 0)
			);
	}
	return {
		project,
		hackatimeSeconds
	};
};
