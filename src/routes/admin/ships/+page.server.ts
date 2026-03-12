import { decrypt } from '$lib/server/crypto';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { ShipStatusPub } from '$lib';

export const load: PageServerLoad = async ({ locals, url }) => {
	const accessToken = decrypt(locals.user!.accessToken);

	const status = (url.searchParams.get('status') ?? 'PENDING') as ShipStatusPub;

	const projectShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, status))
		.orderBy(ships.id);
	console.log(projectShips);
	return {
		ships: projectShips
	};
};
