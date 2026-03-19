import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url, cookies }) => {
	const ref = url.searchParams.get('ref');
	if (ref) cookies.set('referall', ref, { path: '/' });
	return {};
};
