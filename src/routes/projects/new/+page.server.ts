import type { Action } from './$types';

export const actions = {
	default: async ({ cookies, request }) => {
		const data = await request.formData();
		console.log(data.get('title'));
		console.log(data);
		// TODO
	}
} satisfies Action;
