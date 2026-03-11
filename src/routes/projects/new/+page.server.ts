import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { decrypt } from '$lib/server/crypto';
import type { ProjectCategory } from '$lib';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const accessToken = decrypt(locals.user.accessToken);

	const claimedProjects = (
		await db
			.select({ hackatimeProjects: projects.hackatimeProjects })
			.from(projects)
			.where(eq(projects.userId, locals.user.id))
	).flatMap((p) => p.hackatimeProjects);

	const allHackatimeProjects = await fetch(
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
	console.log(allHackatimeProjects);

	return {
		projects: allHackatimeProjects.projects.map((proj: any) => {
			return { name: proj.name, claimed: claimedProjects.includes(proj.name) };
		})
	};
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
