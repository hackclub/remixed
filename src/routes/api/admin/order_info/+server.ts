import { db } from '$lib/server/db';
import { orders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { decrypt } from '$lib/server/crypto';

export const GET: RequestHandler = async ({ url }) => {
	const orderId = Number(url.searchParams.get('id'));
	if (!orderId) return new Response('Provide an id', { status: 400 });

	const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
	const decryptedOrder = {
		...order,
		fullName: decrypt(order.fullName),
		email: decrypt(order.email),
		addressLine1: decrypt(order.addressLine1),
		addressLine2: order.addressLine2 ? decrypt(order.addressLine2) : null,
		city: decrypt(order.city),
		state: decrypt(order.state),
		country: decrypt(order.country),
		zipCode: decrypt(order.zipCode),
	};
	console.log(decryptedOrder);
	return new Response(JSON.stringify(decryptedOrder));
};
