import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	return new Response('shit');
};
