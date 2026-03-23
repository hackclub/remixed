import { getAllowedAdminPages, hasAdminAccess } from '$lib/admin';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const roles = locals.user?.roles;

	if (!hasAdminAccess(roles)) {
		redirect(303, '/');
	}

	return {
		adminLinks: getAllowedAdminPages(roles),
	};
};
