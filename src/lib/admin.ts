import type { RoleEnumPub } from './index';

type AdminPageDefinition = {
	href: string;
	title: string;
	description: string;
	roles: RoleEnumPub[];
};

export type AdminPageLink = Omit<AdminPageDefinition, 'roles'>;

export const ADMIN_PAGES: AdminPageDefinition[] = [
	{
		href: '/admin/ships',
		title: 'Ship Reviews',
		description: 'Review pending project submissions and handle approvals or rejections.',
		roles: ['REVIEWER'],
	},
	{
		href: '/admin/users',
		title: 'Users',
		description: 'Edit account details, balances, referrals, and admin permissions for users.',
		roles: ['ORGANIZER'],
	},
	{
		href: '/admin/shop',
		title: 'Shop Catalog',
		description: 'Create, update, or delete shop items, pricing, descriptions, and imagery.',
		roles: ['ORGANIZER'],
	},
	{
		href: '/admin/orders',
		title: 'Order Fulfillment',
		description: 'Inspect pending shop orders and mark completed shipments as fulfilled.',
		roles: ['ORGANIZER'],
	},
	{
		href: '/admin/projects',
		title: 'Projects',
		description: 'Search projects, inspect stats, and update project details from one place.',
		roles: ['ORGANIZER'],
	},
	{
		href: '/admin/audit',
		title: 'Audit Logs',
		description: 'Review admin actions, entity changes, and sensitive access events in a table.',
		roles: ['ORGANIZER'],
	},
];

export function getAllowedAdminPages(roles: RoleEnumPub[] | null | undefined): AdminPageLink[] {
	const activeRoles = roles ?? [];
	return ADMIN_PAGES.filter((page) => page.roles.some((role) => activeRoles.includes(role))).map(
		({ roles: _roles, ...page }) => page,
	);
}

export function hasAdminAccess(roles: RoleEnumPub[] | null | undefined): boolean {
	return getAllowedAdminPages(roles).length > 0;
}
