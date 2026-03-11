import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import { fail } from '@sveltejs/kit';
import type { ProjectCategory } from '$lib';
import { getProjects } from '$lib/server/hackatimeProjects';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);
	const projectId = Number(params.id);

	console.time('thng');
	const [project] = await db.select().from(projects).where(eq(projectId, projects.id));
	console.timeEnd('thng');

	return {
		project,
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
		console.log(data);
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
