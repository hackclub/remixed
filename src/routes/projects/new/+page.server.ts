import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import type { ProjectCategory } from '$lib';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const hackatimeProjects = await fetch(
		'https://hackatime.hackclub.com/api/v1/authenticated/projects?' +
			new URLSearchParams({ start: '2026-03-07' }),
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		}
	).then((r) => r.json());

	return hackatimeProjects;
};

export const actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const title = data.get('title') as string;
		const description = data.get('desc') as string | null;
		const category = (data.get('category') ?? 'OTHER') as ProjectCategory;
		const hackatimeProjects = data.getAll('hackatime_projects') as string[];
		console.log('FUCK', hackatimeProjects);

		if (!title) return fail(400, { error: 'Missing required fields' });

		await db.insert(projects).values({
			userId: locals.user.id,
			title,
			description,
			category,
			hackatimeProjects
		});

		redirect(303, '/projects');
	}
} satisfies Actions;
