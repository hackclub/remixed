import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) => {
	return new Response('shit');
};
