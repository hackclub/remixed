import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, request }) => {
	console.log(request.body);
	return new Response('shit');
};
