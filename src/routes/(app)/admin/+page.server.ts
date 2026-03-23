import { db } from '$lib/server/db';
import { orders, projects, ships, users } from '$lib/server/db/schema';
import { count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [
		[userCount],
		[projectCount],
		[shipCount],
		[pendingShipCount],
		[orderCount],
		[pendingOrderCount],
	] = await Promise.all([
		db.select({ value: count() }).from(users),
		db.select({ value: count() }).from(projects),
		db.select({ value: count() }).from(ships),
		db.select({ value: count() }).from(ships).where(eq(ships.status, 'PENDING')),
		db.select({ value: count() }).from(orders),
		db.select({ value: count() }).from(orders).where(eq(orders.status, 'PENDING')),
	]);

	return {
		stats: [
			{ label: 'Users', value: userCount.value, detail: null },
			{ label: 'Projects', value: projectCount.value, detail: null },
			{
				label: 'Ships',
				value: shipCount.value,
				detail: `${pendingShipCount.value} pending, ${shipCount.value - pendingShipCount.value} reviewed`,
			},
			{
				label: 'Orders',
				value: orderCount.value,
				detail: `${pendingOrderCount.value} pending, ${orderCount.value - pendingOrderCount.value} fulfilled`,
			},
		],
	};
};
