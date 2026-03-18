import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const allUsers = await db.select().from(users);
	return {
		users: allUsers,
	};
};

export const actions: Actions = {
	updateRoles: async ({ request, locals }) => {
		const data = await request.formData();
		console.log(data);
		const userId = Number(data.get('userId'));
		const userRoles = data.getAll('userRoles') as ('USER' | 'STAFF' | 'REVIEWER' | 'ORGANIZER')[];

		await db
			.update(users)
			.set({ roles: ['USER', ...userRoles] })
			.where(eq(users.id, userId));
		await db
			.insert(auditLogs)
			.values({ category: 'EDIT_USER', userId: locals.user!.id, data: { userId, userRoles } });
	},
};
