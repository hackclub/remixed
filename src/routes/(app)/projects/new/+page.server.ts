import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import type { ProjectCategory } from '$lib';
import { eq } from 'drizzle-orm';
import { getProjects } from '$lib/server/hackatimeProjects';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const projects = await getProjects(locals.user.id, accessToken);

	return {
		projects: projects.map((proj: any) => {
			return { name: proj.name, claimed: proj.claimedBy != null };
		}),
	};
};

export const actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const title = (data.get('title') as string)?.trim();
		const description = (data.get('desc') as string | null)?.trim();
		const category = (data.get('category') ?? 'OTHER') as ProjectCategory;
		const hackatimeProjects = data.getAll('hackatime_projects') as string[];

		if (!title) return fail(400, { error: 'Missing required fields' });

		await db.insert(projects).values({
			userId: locals.user.id,
			title,
			description,
			category,
			hackatimeProjects,
		});

		redirect(303, '/projects');
	},
} satisfies Actions;
