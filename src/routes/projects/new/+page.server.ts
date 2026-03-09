import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ cookies, request }) => {
		const userId = cookies.get('session_user_id');
		if (!userId) return fail(401, { error: 'Unauthorized' });

		const data = await request.formData();
		const title = data.get('title')!;
		const description = data.get('desc');
		const category = data.get('category') ?? 'OTHER';

		if (!title) return fail(400, { error: 'Missing required fields' });

		await db.insert(projects).values({
			userId: Number(userId),
			title,
			description,
			category,
			hackatimeProjects: []
		});

		redirect(303, '/dashboard');
	}
} satisfies Actions;
