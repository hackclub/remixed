import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const allUsers = await db.select().from(users);
	console.log(allUsers);
	return {
		users: allUsers,
	};
};

export const actions: Actions = {
	updateRoles: async ({ request }) => {
		const data = await request.formData();
		console.log(data);
		const userId = data.get('userId');
		const userRoles = data.getAll('userRoles');

		await db
			.update(users)
			.set({ roles: ['USER', ...userRoles] })
			.where(eq(users.id, userId));
	},
};
