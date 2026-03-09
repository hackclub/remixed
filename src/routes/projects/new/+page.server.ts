import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const title = data.get('title') as string;
		const description = data.get('desc') as string | null;
		const category = (data.get('category') ?? 'OTHER') as 'GAME' | 'WEBSITE' | 'MUSIC' | 'OTHER';

		if (!title) return fail(400, { error: 'Missing required fields' });

		await db.insert(projects).values({
			userId: locals.user.id,
			title,
			description,
			category,
			hackatimeProjects: []
		});

		redirect(303, '/projects');
	}
} satisfies Actions;
