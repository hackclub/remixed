import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) return { user: null };

	const { birthday, addressLine1, addressLine2, city, state, country, zipCode, ...safeUser } =
		locals.user;

	return { user: safeUser };
};
