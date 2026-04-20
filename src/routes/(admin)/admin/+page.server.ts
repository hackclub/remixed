import { db } from '$lib/server/db';
import {
	deletedProjects,
	deletedShips,
	orders,
	projects,
	ships,
	users,
} from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [
		[userCount],
		[projectCount],
		[deletedProjectCount],
		[shipCount],
		[pendingShipCount],
		[deletedShipCount],
		[orderCount],
		[pendingOrderCount],
	] = await Promise.all([
		db.select({ value: count() }).from(users),
		db.select({ value: count() }).from(projects),
		db.select({ value: count() }).from(deletedProjects),
		db.select({ value: count() }).from(ships),
		db.select({ value: count() }).from(ships).where(eq(ships.status, 'PENDING')),
		db.select({ value: count() }).from(deletedShips),
		db.select({ value: count() }).from(orders),
		db.select({ value: count() }).from(orders).where(eq(orders.status, 'PENDING')),
	]);

	const reviewedShipCount = shipCount.value - pendingShipCount.value;

	return {
		stats: [
			{ label: 'Users', value: userCount.value, detail: null },
			{
				label: 'Projects',
				value: projectCount.value,
				detail: `${deletedProjectCount.value} deleted`,
			},
			{
				label: 'Ships',
				value: shipCount.value,
				detail: `${pendingShipCount.value} pending, ${reviewedShipCount} reviewed, ${deletedShipCount.value} deleted`,
			},
			{
				label: 'Orders',
				value: orderCount.value,
				detail: `${pendingOrderCount.value} pending, ${orderCount.value - pendingOrderCount.value} fulfilled`,
			},
		],
	};
};
