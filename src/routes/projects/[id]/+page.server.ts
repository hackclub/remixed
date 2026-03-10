import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail } from '@sveltejs/kit';
import type { ProjectCategory } from '$lib';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);
	const projectId = Number(params.id);

	const [project] = await db.select().from(projects).where(eq(projectId, projects.id));
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
		hackatimeSeconds,
		currentUserId: locals.user.id
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });
		const projectId = Number(params.id);

		const [project] = await db.select().from(projects).where(eq(projectId, projects.id));
		if (!project || project.userId != locals.user.id) return fail(403, { error: 'Forbidden' });

		const data = await request.formData();
		const title = data.get('title') as string;
		const description = data.get('description') as string;
		const coverArt = data.get('coverArt') as string | null;
		const githubUrl = data.get('githubUrl') as string | null;
		const demoUrl = data.get('demoUrl') as string | null;
		const category = data.get('category') as ProjectCategory;
		const hackatimeProjects = data.getAll('hackatimeProjects') as string[];

		await db
			.update(projects)
			.set({ title, description, coverArt, githubUrl, demoUrl, category, hackatimeProjects })
			.where(eq(projects.id, projectId));
	}
};
