import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	auditLogs,
	deletedProjects,
	deletedShips,
	deletedShopItems,
	notesLedger,
	orders,
	projects,
	shipReviews,
	ships,
	shopItems,
	users,
} from '$lib/server/db/schema';
import { decrypt } from '$lib/server/crypto';
import { recordAuditLog } from '$lib/server/audit';
import { performReviewAction, performUpdateReview } from '$lib/server/reviews';
import { sendShopMessage } from '$lib/server/slack/shop_message';
import { getProjects as getHackatimeProjects } from '$lib/server/hackatimeProjects';
import { isProjectCategory, type ProjectCategory, type RoleEnumPub } from '$lib';

export type ToolContext = {
	/** The admin whose token is making the call; the actor for audit logs. */
	actor: typeof users.$inferSelect;
};

type JsonSchema = Record<string, unknown>;

export type ToolDefinition = {
	name: string;
	description: string;
	inputSchema: JsonSchema;
	/** Set for tools that mutate data, so clients can warn before invoking. */
	mutates?: boolean;
	handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

/** Thrown by handlers for expected, user-facing failures (mapped to isError). */
export class ToolError extends Error {}

// --- small arg helpers -------------------------------------------------------

function reqInt(args: Record<string, unknown>, key: string): number {
	const value = args[key];
	const n = typeof value === 'string' ? Number(value) : value;
	if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n)) {
		throw new ToolError(`"${key}" must be an integer.`);
	}
	return n;
}

function optInt(args: Record<string, unknown>, key: string): number | undefined {
	if (args[key] === undefined || args[key] === null) return undefined;
	return reqInt(args, key);
}

function optNum(args: Record<string, unknown>, key: string): number | undefined {
	if (args[key] === undefined || args[key] === null) return undefined;
	const value = args[key];
	const n = typeof value === 'string' ? Number(value) : value;
	if (typeof n !== 'number' || !Number.isFinite(n)) throw new ToolError(`"${key}" must be a number.`);
	return n;
}

function optStr(args: Record<string, unknown>, key: string): string | undefined {
	if (args[key] === undefined || args[key] === null) return undefined;
	return String(args[key]);
}

function reqStr(args: Record<string, unknown>, key: string): string {
	const value = optStr(args, key);
	if (value === undefined || value.trim() === '') throw new ToolError(`"${key}" is required.`);
	return value;
}

function pageLimit(args: Record<string, unknown>, fallback = 50): number {
	const limit = optInt(args, 'limit') ?? fallback;
	return Math.min(Math.max(limit, 1), 200);
}

function pageOffset(args: Record<string, unknown>): number {
	return Math.max(optInt(args, 'offset') ?? 0, 0);
}

// --- shared shaping ----------------------------------------------------------

const SAFE_USER_COLUMNS = {
	id: users.id,
	username: users.username,
	slackId: users.slackId,
	hcaId: users.hcaId,
	hackatimeId: users.hackatimeId,
	avatarUrl: users.avatarUrl,
	email: users.email,
	firstName: users.firstName,
	lastName: users.lastName,
	notesBalance: users.notesBalance,
	referrals: users.referrals,
	roles: users.roles,
	createdAt: users.createdAt,
};

async function resolveUser(args: Record<string, unknown>) {
	const userId = optInt(args, 'userId');
	const slackId = optStr(args, 'slackId');
	const username = optStr(args, 'username');
	const hcaId = optStr(args, 'hcaId');
	const email = optStr(args, 'email');

	let where;
	if (userId !== undefined) where = eq(users.id, userId);
	else if (slackId) where = eq(users.slackId, slackId);
	else if (hcaId) where = eq(users.hcaId, hcaId);
	else if (email) where = eq(users.email, email);
	else if (username) where = eq(users.username, username);
	else throw new ToolError('Provide one of: userId, slackId, hcaId, email, username.');

	const [user] = await db.select().from(users).where(where);
	if (!user) throw new ToolError('User not found.');
	return user;
}

function publicUser(user: typeof users.$inferSelect) {
	return {
		id: user.id,
		username: user.username,
		slackId: user.slackId,
		hcaId: user.hcaId,
		hackatimeId: user.hackatimeId,
		avatarUrl: user.avatarUrl,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		notesBalance: user.notesBalance,
		referrals: user.referrals,
		roles: user.roles,
		createdAt: user.createdAt,
		hasAddressOnFile: Boolean(user.addressLine1),
	};
}

const decryptOrNull = (val: string | null) => {
	if (!val) return null;
	try {
		return decrypt(val);
	} catch {
		return null;
	}
};

// --- tool registry -----------------------------------------------------------

export const TOOLS: ToolDefinition[] = [
	{
		name: 'whoami',
		description:
			'Returns the admin account this MCP token acts as, including its roles. All write actions are audit-logged under this account.',
		inputSchema: { type: 'object', properties: {} },
		handler: async (_args, ctx) => publicUser(ctx.actor),
	},
	{
		name: 'get_program_stats',
		description:
			'High-level counts: ships pending reviewer review, ships pending HQ authorization, and orders awaiting fulfillment, plus totals for users, projects, and ships.',
		inputSchema: { type: 'object', properties: {} },
		handler: async () => {
			const [pendingReview] = await db
				.select({ count: count() })
				.from(ships)
				.where(eq(ships.status, 'PENDING'));
			const [pendingHq] = await db
				.select({ count: count() })
				.from(ships)
				.where(eq(ships.status, 'REVIEWER_APPROVED'));
			const [pendingFulfillment] = await db
				.select({ count: count() })
				.from(orders)
				.where(eq(orders.status, 'PENDING'));
			const [userCount] = await db.select({ count: count() }).from(users);
			const [projectCount] = await db.select({ count: count() }).from(projects);
			const [shipCount] = await db.select({ count: count() }).from(ships);
			return {
				pendingReviewCount: pendingReview.count,
				pendingHqCount: pendingHq.count,
				pendingFulfillmentCount: pendingFulfillment.count,
				totalUsers: userCount.count,
				totalProjects: projectCount.count,
				totalShips: shipCount.count,
			};
		},
	},
	{
		name: 'list_users',
		description:
			'List users with balances, referral counts, and roles. Optional case-insensitive search across username, email, and Slack ID, and an optional role filter.',
		inputSchema: {
			type: 'object',
			properties: {
				search: { type: 'string', description: 'Matches username, email, or Slack ID.' },
				role: {
					type: 'string',
					enum: ['USER', 'STAFF', 'REVIEWER', 'ORGANIZER', 'HQ'],
					description: 'Only return users holding this role.',
				},
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const search = optStr(args, 'search');
			const role = optStr(args, 'role') as RoleEnumPub | undefined;
			const conditions = [];
			if (search) {
				conditions.push(
					or(
						ilike(users.username, `%${search}%`),
						ilike(users.email, `%${search}%`),
						ilike(users.slackId, `%${search}%`),
					)!,
				);
			}
			if (role) conditions.push(sql`${role} = ANY(${users.roles})`);
			const where = conditions.length ? and(...conditions) : undefined;
			const [total] = await db.select({ count: count() }).from(users).where(where);
			const rows = await db
				.select(SAFE_USER_COLUMNS)
				.from(users)
				.where(where)
				.orderBy(asc(users.id))
				.limit(pageLimit(args))
				.offset(pageOffset(args));
			return { totalCount: total.count, users: rows };
		},
	},
	{
		name: 'get_user',
		description:
			'Full profile for one user, resolved by userId, slackId, hcaId, email, or username. Includes their projects, a ship summary, and recent notes-ledger entries. Does not decrypt address/PII (use get_user_address).',
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				slackId: { type: 'string' },
				hcaId: { type: 'string' },
				email: { type: 'string' },
				username: { type: 'string' },
			},
		},
		handler: async (args) => {
			const user = await resolveUser(args);
			const [userProjects, ledger] = await Promise.all([
				db.select().from(projects).where(eq(projects.userId, user.id)).orderBy(asc(projects.id)),
				db
					.select()
					.from(notesLedger)
					.where(eq(notesLedger.userId, user.id))
					.orderBy(desc(notesLedger.createdAt))
					.limit(25),
			]);

			const projectIds = userProjects.map((p) => p.id);
			const userShips = projectIds.length
				? await db.select().from(ships).where(inArray(ships.projectId, projectIds))
				: [];
			const shipSummary = {
				total: userShips.length,
				pending: userShips.filter((s) => s.status === 'PENDING').length,
				reviewerApproved: userShips.filter((s) => s.status === 'REVIEWER_APPROVED').length,
				approved: userShips.filter((s) => s.status === 'APPROVED').length,
				rejected: userShips.filter((s) => s.status === 'REJECTED').length,
			};

			return {
				user: publicUser(user),
				projects: userProjects,
				shipSummary,
				recentLedger: ledger,
			};
		},
	},
	{
		name: 'get_user_address',
		description:
			'Decrypts and returns a user\'s stored shipping/PII fields (name, address, birthday). Sensitive — every call is recorded in the audit log.',
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				slackId: { type: 'string' },
				username: { type: 'string' },
			},
		},
		handler: async (args, ctx) => {
			const user = await resolveUser(args);
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'EDIT_USER',
				entityType: 'user',
				entityId: user.id,
				changeType: 'reveal_address',
				data: { source: 'mcp' },
			});
			return {
				userId: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				birthday: decryptOrNull(user.birthday),
				addressLine1: decryptOrNull(user.addressLine1),
				addressLine2: decryptOrNull(user.addressLine2),
				city: decryptOrNull(user.city),
				state: decryptOrNull(user.state),
				country: decryptOrNull(user.country),
				zipCode: decryptOrNull(user.zipCode),
			};
		},
	},
	{
		name: 'get_user_notes_ledger',
		description: 'Returns notes-ledger (balance change) entries for a user, newest first.',
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				slackId: { type: 'string' },
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const user = await resolveUser(args);
			const entries = await db
				.select()
				.from(notesLedger)
				.where(eq(notesLedger.userId, user.id))
				.orderBy(desc(notesLedger.createdAt))
				.limit(pageLimit(args))
				.offset(pageOffset(args));
			return { userId: user.id, entries };
		},
	},
	{
		name: 'list_projects',
		description:
			'List projects with their owner and ship stats. Optional title/description search, owner filter, and ship-status filter.',
		inputSchema: {
			type: 'object',
			properties: {
				search: { type: 'string', description: 'Matches project title or description.' },
				userId: { type: 'integer', description: 'Only projects owned by this user.' },
				status: {
					type: 'string',
					enum: ['pending', 'reviewer_approved', 'approved', 'rejected'],
					description: 'Only projects with at least one ship in this status.',
				},
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const search = optStr(args, 'search');
			const userId = optInt(args, 'userId');
			const statusArg = optStr(args, 'status');
			const statusMap: Record<string, string> = {
				pending: 'PENDING',
				reviewer_approved: 'REVIEWER_APPROVED',
				approved: 'APPROVED',
				rejected: 'REJECTED',
			};

			const conditions = [];
			if (search) {
				conditions.push(
					or(ilike(projects.title, `%${search}%`), ilike(projects.description, `%${search}%`))!,
				);
			}
			if (userId !== undefined) conditions.push(eq(projects.userId, userId));
			if (statusArg && statusMap[statusArg]) {
				conditions.push(
					sql`EXISTS (SELECT 1 FROM ships WHERE ships.project_id = projects.id AND ships.status = ${statusMap[statusArg]})`,
				);
			}
			const where = conditions.length ? and(...conditions) : undefined;

			const [total] = await db.select({ count: count() }).from(projects).where(where);
			const rows = await db
				.select({ project: projects, owner: SAFE_USER_COLUMNS })
				.from(projects)
				.innerJoin(users, eq(projects.userId, users.id))
				.where(where)
				.orderBy(asc(projects.id))
				.limit(pageLimit(args))
				.offset(pageOffset(args));

			const ids = rows.map((r) => r.project.id);
			const projShips = ids.length
				? await db.select().from(ships).where(inArray(ships.projectId, ids))
				: [];
			const byProject = new Map<number, typeof projShips>();
			for (const s of projShips) {
				const list = byProject.get(s.projectId) ?? [];
				list.push(s);
				byProject.set(s.projectId, list);
			}

			return {
				totalCount: total.count,
				projects: rows.map((r) => {
					const list = byProject.get(r.project.id) ?? [];
					return {
						...r.project,
						owner: r.owner,
						shipStats: {
							total: list.length,
							pending: list.filter((s) => s.status === 'PENDING').length,
							reviewerApproved: list.filter((s) => s.status === 'REVIEWER_APPROVED').length,
							approved: list.filter((s) => s.status === 'APPROVED').length,
							rejected: list.filter((s) => s.status === 'REJECTED').length,
						},
					};
				}),
			};
		},
	},
	{
		name: 'get_project',
		description:
			'Full detail for one project: fields, owner, all ships, and the complete review timeline (approvals, rejections, comments) with reviewer names.',
		inputSchema: {
			type: 'object',
			properties: { projectId: { type: 'integer' } },
			required: ['projectId'],
		},
		handler: async (args) => {
			const projectId = reqInt(args, 'projectId');
			const [row] = await db
				.select({ project: projects, owner: users })
				.from(projects)
				.innerJoin(users, eq(projects.userId, users.id))
				.where(eq(projects.id, projectId));
			if (!row) throw new ToolError(`No project with id ${projectId}.`);

			const projectShips = await db
				.select()
				.from(ships)
				.where(eq(ships.projectId, projectId))
				.orderBy(asc(ships.submittedAt));

			const shipIds = projectShips.map((s) => s.id);
			const reviews = shipIds.length
				? await db
						.select({
							review: shipReviews,
							reviewer: { id: users.id, username: users.username, slackId: users.slackId },
						})
						.from(shipReviews)
						.innerJoin(users, eq(shipReviews.reviewerId, users.id))
						.where(inArray(shipReviews.shipId, shipIds))
						.orderBy(asc(shipReviews.createdAt))
				: [];

			return {
				project: row.project,
				owner: publicUser(row.owner),
				ships: projectShips,
				reviews: reviews.map((r) => ({ ...r.review, reviewer: r.reviewer })),
			};
		},
	},
	{
		name: 'list_ships',
		description: 'List ships (project submissions) filterable by status or project, newest first.',
		inputSchema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					enum: ['PENDING', 'REVIEWER_APPROVED', 'APPROVED', 'REJECTED', 'CANCELLED'],
				},
				projectId: { type: 'integer' },
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const status = optStr(args, 'status');
			const projectId = optInt(args, 'projectId');
			const conditions = [];
			if (status) conditions.push(eq(ships.status, status as typeof ships.$inferSelect.status));
			if (projectId !== undefined) conditions.push(eq(ships.projectId, projectId));
			const where = conditions.length ? and(...conditions) : undefined;

			const [total] = await db.select({ count: count() }).from(ships).where(where);
			const rows = await db
				.select({
					ship: ships,
					project: { id: projects.id, title: projects.title, userId: projects.userId },
					owner: { id: users.id, username: users.username, slackId: users.slackId },
				})
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.innerJoin(users, eq(projects.userId, users.id))
				.where(where)
				.orderBy(desc(ships.submittedAt))
				.limit(pageLimit(args))
				.offset(pageOffset(args));
			return {
				totalCount: total.count,
				ships: rows.map((r) => ({ ...r.ship, project: r.project, owner: r.owner })),
			};
		},
	},
	{
		name: 'get_ship',
		description: 'Detail for one ship: the ship, its project, owner, and every review on it.',
		inputSchema: {
			type: 'object',
			properties: { shipId: { type: 'integer' } },
			required: ['shipId'],
		},
		handler: async (args) => {
			const shipId = reqInt(args, 'shipId');
			const [row] = await db
				.select({ ship: ships, project: projects, owner: users })
				.from(ships)
				.innerJoin(projects, eq(ships.projectId, projects.id))
				.innerJoin(users, eq(projects.userId, users.id))
				.where(eq(ships.id, shipId));
			if (!row) throw new ToolError(`No ship with id ${shipId}.`);

			const reviews = await db
				.select({
					review: shipReviews,
					reviewer: { id: users.id, username: users.username, slackId: users.slackId },
				})
				.from(shipReviews)
				.innerJoin(users, eq(shipReviews.reviewerId, users.id))
				.where(eq(shipReviews.shipId, shipId))
				.orderBy(asc(shipReviews.createdAt));

			return {
				ship: row.ship,
				project: row.project,
				owner: publicUser(row.owner),
				reviews: reviews.map((r) => ({ ...r.review, reviewer: r.reviewer })),
			};
		},
	},
	{
		name: 'list_orders',
		description:
			'List shop orders with the ordering user and item. Filter by status and search by user. Shipping addresses stay encrypted unless reveal_order_address is used.',
		inputSchema: {
			type: 'object',
			properties: {
				status: { type: 'string', enum: ['PENDING', 'FULFILLED'] },
				search: { type: 'string', description: 'Matches user username or email.' },
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const status = optStr(args, 'status');
			const search = optStr(args, 'search');
			const conditions = [];
			if (status) conditions.push(eq(orders.status, status as typeof orders.$inferSelect.status));
			if (search) {
				conditions.push(
					or(ilike(users.username, `%${search}%`), ilike(users.email, `%${search}%`))!,
				);
			}
			const where = conditions.length ? and(...conditions) : undefined;

			const [total] = await db
				.select({ count: count() })
				.from(orders)
				.innerJoin(users, eq(orders.userId, users.id))
				.where(where);
			const rows = await db
				.select({
					order: {
						id: orders.id,
						status: orders.status,
						itemId: orders.itemId,
						reference: orders.reference,
						adminNotes: orders.adminNotes,
						userNotes: orders.userNotes,
						createdAt: orders.createdAt,
						fulfilledAt: orders.fulfilledAt,
					},
					user: { id: users.id, username: users.username, email: users.email, slackId: users.slackId },
					item: { id: shopItems.id, name: shopItems.name, cost: shopItems.cost },
				})
				.from(orders)
				.innerJoin(users, eq(orders.userId, users.id))
				.innerJoin(shopItems, eq(orders.itemId, shopItems.id))
				.where(where)
				.orderBy(desc(orders.createdAt))
				.limit(pageLimit(args))
				.offset(pageOffset(args));
			return {
				totalCount: total.count,
				orders: rows.map((r) => ({ ...r.order, user: r.user, item: r.item })),
			};
		},
	},
	{
		name: 'get_order',
		description:
			'Detail for one order with user and item. Address fields remain encrypted; use reveal_order_address to decrypt them.',
		inputSchema: {
			type: 'object',
			properties: { orderId: { type: 'integer' } },
			required: ['orderId'],
		},
		handler: async (args) => {
			const orderId = reqInt(args, 'orderId');
			const [row] = await db
				.select({
					order: orders,
					user: { id: users.id, username: users.username, email: users.email, slackId: users.slackId },
					item: shopItems,
				})
				.from(orders)
				.innerJoin(users, eq(orders.userId, users.id))
				.innerJoin(shopItems, eq(orders.itemId, shopItems.id))
				.where(eq(orders.id, orderId));
			if (!row) throw new ToolError(`No order with id ${orderId}.`);
			const { fullName, addressLine1, addressLine2, city, state, country, zipCode, email, ...safe } =
				row.order;
			void fullName;
			void addressLine1;
			void addressLine2;
			void city;
			void state;
			void country;
			void zipCode;
			void email;
			return { order: { ...safe, addressEncrypted: true }, user: row.user, item: row.item };
		},
	},
	{
		name: 'reveal_order_address',
		description:
			'Decrypts and returns the full shipping address for an order. Sensitive — recorded in the audit log on every call.',
		inputSchema: {
			type: 'object',
			properties: { orderId: { type: 'integer' } },
			required: ['orderId'],
		},
		handler: async (args, ctx) => {
			const orderId = reqInt(args, 'orderId');
			const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
			if (!order) throw new ToolError(`No order with id ${orderId}.`);
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'ORDER_INFO',
				entityType: 'order',
				entityId: orderId,
				changeType: 'reveal_address',
				data: { source: 'mcp' },
			});
			return {
				orderId,
				fullName: decryptOrNull(order.fullName),
				email: decryptOrNull(order.email),
				addressLine1: decryptOrNull(order.addressLine1),
				addressLine2: order.addressLine2 ? decryptOrNull(order.addressLine2) : null,
				city: decryptOrNull(order.city),
				state: decryptOrNull(order.state),
				country: decryptOrNull(order.country),
				zipCode: decryptOrNull(order.zipCode),
			};
		},
	},
	{
		name: 'list_shop_items',
		description: 'List all active shop items with pricing and categories.',
		inputSchema: { type: 'object', properties: {} },
		handler: async () => {
			const items = await db.select().from(shopItems).orderBy(asc(shopItems.id));
			return { items };
		},
	},
	{
		name: 'get_shop_item',
		description: 'Detail for one shop item, including how many orders reference it.',
		inputSchema: {
			type: 'object',
			properties: { itemId: { type: 'integer' } },
			required: ['itemId'],
		},
		handler: async (args) => {
			const itemId = reqInt(args, 'itemId');
			const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
			if (!item) throw new ToolError(`No shop item with id ${itemId}.`);
			const [orderCount] = await db
				.select({ count: count() })
				.from(orders)
				.where(eq(orders.itemId, itemId));
			return { item, orderCount: orderCount.count };
		},
	},
	{
		name: 'list_audit_logs',
		description:
			'List admin audit-log entries, newest first. Filter by category and/or acting user.',
		inputSchema: {
			type: 'object',
			properties: {
				category: {
					type: 'string',
					enum: ['ORDER_INFO', 'FULFILL', 'EDIT_USER', 'SHIP_REVIEW', 'SHOP_ITEM', 'PROJECT'],
				},
				userId: { type: 'integer', description: 'Acting (admin) user id.' },
				limit: { type: 'integer', description: 'Default 50, max 200.' },
				offset: { type: 'integer' },
			},
		},
		handler: async (args) => {
			const category = optStr(args, 'category');
			const userId = optInt(args, 'userId');
			const conditions = [];
			if (category)
				conditions.push(eq(auditLogs.category, category as typeof auditLogs.$inferSelect.category));
			if (userId !== undefined) conditions.push(eq(auditLogs.userId, userId));
			const where = conditions.length ? and(...conditions) : undefined;
			const rows = await db
				.select({
					log: auditLogs,
					actor: { id: users.id, username: users.username },
				})
				.from(auditLogs)
				.innerJoin(users, eq(auditLogs.userId, users.id))
				.where(where)
				.orderBy(desc(auditLogs.createdAt))
				.limit(pageLimit(args))
				.offset(pageOffset(args));
			return { logs: rows.map((r) => ({ ...r.log, actor: r.actor })) };
		},
	},
	{
		name: 'list_deleted_projects',
		description: 'List soft-deleted (archived) projects with who deleted them.',
		inputSchema: { type: 'object', properties: {} },
		handler: async () => {
			const rows = await db
				.select()
				.from(deletedProjects)
				.orderBy(desc(deletedProjects.deletedAt));
			return { deletedProjects: rows };
		},
	},
	{
		name: 'get_hackatime_stats',
		description:
			"Fetches the user's tracked Hackatime projects and hours (filtered by the program start date), marking which are claimed by a Remixed project. Requires the user to have connected Hackatime.",
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				slackId: { type: 'string' },
				username: { type: 'string' },
			},
		},
		handler: async (args) => {
			const user = await resolveUser(args);
			if (!user.accessToken)
				throw new ToolError('User has not connected Hackatime (no access token on file).');
			let token: string;
			try {
				token = decrypt(user.accessToken);
			} catch {
				throw new ToolError('Could not decrypt the stored Hackatime token.');
			}
			const projectsWithTime = await getHackatimeProjects(user.id, token);
			return { userId: user.id, hackatimeProjects: projectsWithTime };
		},
	},

	// --- mutations -----------------------------------------------------------

	{
		name: 'update_user',
		description:
			'Update a user account. Any omitted field is left unchanged. Roles always implicitly include USER. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				username: { type: 'string' },
				slackId: { type: 'string' },
				hcaId: { type: 'string' },
				avatarUrl: { type: 'string' },
				email: { type: 'string' },
				notesBalance: { type: 'integer', description: 'Sets the absolute balance. Prefer adjust_user_balance for relative changes (it writes a ledger entry).' },
				referrals: { type: 'integer' },
				roles: {
					type: 'array',
					items: { type: 'string', enum: ['USER', 'STAFF', 'REVIEWER', 'ORGANIZER', 'HQ'] },
				},
			},
			required: ['userId'],
		},
		handler: async (args, ctx) => {
			const userId = reqInt(args, 'userId');
			const [existing] = await db.select().from(users).where(eq(users.id, userId));
			if (!existing) throw new ToolError(`No user with id ${userId}.`);

			const updates: Partial<typeof users.$inferInsert> = {};
			if (args.username !== undefined) updates.username = reqStr(args, 'username');
			if (args.slackId !== undefined) updates.slackId = reqStr(args, 'slackId');
			if (args.hcaId !== undefined) updates.hcaId = optStr(args, 'hcaId') || null;
			if (args.avatarUrl !== undefined) updates.avatarUrl = optStr(args, 'avatarUrl') || null;
			if (args.email !== undefined) updates.email = optStr(args, 'email') || null;
			if (args.notesBalance !== undefined) updates.notesBalance = reqInt(args, 'notesBalance');
			if (args.referrals !== undefined) updates.referrals = reqInt(args, 'referrals');
			if (args.roles !== undefined) {
				if (!Array.isArray(args.roles)) throw new ToolError('"roles" must be an array.');
				const incoming = args.roles as RoleEnumPub[];
				updates.roles = ['USER', ...new Set(incoming.filter((r) => r !== 'USER'))];
			}

			if (updates.slackId && updates.slackId !== existing.slackId) {
				const [conflict] = await db
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.slackId, updates.slackId), sql`${users.id} != ${userId}`));
				if (conflict) throw new ToolError('Slack ID is already in use.');
			}
			if (updates.hcaId && updates.hcaId !== existing.hcaId) {
				const [conflict] = await db
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.hcaId, updates.hcaId), sql`${users.id} != ${userId}`));
				if (conflict) throw new ToolError('HCA ID is already in use.');
			}

			if (Object.keys(updates).length === 0) throw new ToolError('No fields to update.');

			const [updated] = await db
				.update(users)
				.set(updates)
				.where(eq(users.id, userId))
				.returning();
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'EDIT_USER',
				entityType: 'user',
				entityId: userId,
				changeType: 'update',
				data: { before: existing, after: updated, source: 'mcp' },
			});
			return { success: true, user: publicUser(updated) };
		},
	},
	{
		name: 'adjust_user_balance',
		description:
			'Apply a relative change to a user\'s notes balance and record it in the notes ledger. Use a negative delta to deduct. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				userId: { type: 'integer' },
				delta: { type: 'integer', description: 'Signed change in notes (e.g. 50 or -20).' },
				reason: { type: 'string', description: 'Ledger reason, e.g. "manual_adjustment".' },
			},
			required: ['userId', 'delta', 'reason'],
		},
		handler: async (args, ctx) => {
			const userId = reqInt(args, 'userId');
			const delta = reqInt(args, 'delta');
			const reason = reqStr(args, 'reason');
			if (delta === 0) throw new ToolError('"delta" must be non-zero.');

			const result = await db.transaction(async (tx) => {
				const [existing] = await tx.select().from(users).where(eq(users.id, userId));
				if (!existing) throw new ToolError(`No user with id ${userId}.`);
				const [updated] = await tx
					.update(users)
					.set({ notesBalance: sql`${users.notesBalance} + ${delta}` })
					.where(eq(users.id, userId))
					.returning({ notesBalance: users.notesBalance });
				await tx.insert(notesLedger).values({ userId, delta, reason });
				await recordAuditLog(tx, {
					actorUserId: ctx.actor.id,
					category: 'EDIT_USER',
					entityType: 'user',
					entityId: userId,
					changeType: 'balance_adjust',
					data: {
						delta,
						reason,
						oldBalance: existing.notesBalance,
						newBalance: updated.notesBalance,
						source: 'mcp',
					},
				});
				return { oldBalance: existing.notesBalance, newBalance: updated.notesBalance };
			});
			return { success: true, ...result };
		},
	},
	{
		name: 'update_project',
		description:
			'Update a project\'s fields. Omitted fields are left unchanged. hackatimeProjects replaces the full list. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				projectId: { type: 'integer' },
				userId: { type: 'integer', description: 'Reassign ownership to this user.' },
				title: { type: 'string' },
				description: { type: 'string' },
				coverArt: { type: 'string' },
				category: { type: 'string' },
				githubUrl: { type: 'string' },
				demoUrl: { type: 'string' },
				hackatimeProjects: { type: 'array', items: { type: 'string' } },
				hackatimeSeconds: { type: 'integer' },
			},
			required: ['projectId'],
		},
		handler: async (args, ctx) => {
			const projectId = reqInt(args, 'projectId');
			const [existing] = await db.select().from(projects).where(eq(projects.id, projectId));
			if (!existing) throw new ToolError(`No project with id ${projectId}.`);

			const updates: Partial<typeof projects.$inferInsert> = {};
			if (args.userId !== undefined) {
				const newOwnerId = reqInt(args, 'userId');
				const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, newOwnerId));
				if (!owner) throw new ToolError(`No user with id ${newOwnerId} to assign as owner.`);
				updates.userId = newOwnerId;
			}
			if (args.title !== undefined) updates.title = reqStr(args, 'title');
			if (args.description !== undefined) updates.description = optStr(args, 'description') || null;
			if (args.coverArt !== undefined) updates.coverArt = optStr(args, 'coverArt') || null;
			if (args.category !== undefined) {
				const category = reqStr(args, 'category');
				if (!isProjectCategory(category)) throw new ToolError(`Invalid category "${category}".`);
				updates.category = category as ProjectCategory;
			}
			if (args.githubUrl !== undefined) updates.githubUrl = optStr(args, 'githubUrl') || null;
			if (args.demoUrl !== undefined) updates.demoUrl = optStr(args, 'demoUrl') || null;
			if (args.hackatimeProjects !== undefined) {
				if (!Array.isArray(args.hackatimeProjects))
					throw new ToolError('"hackatimeProjects" must be an array of strings.');
				updates.hackatimeProjects = Array.from(
					new Set((args.hackatimeProjects as unknown[]).map((p) => String(p).trim()).filter(Boolean)),
				);
			}
			if (args.hackatimeSeconds !== undefined) updates.hackatimeSeconds = reqInt(args, 'hackatimeSeconds');

			if (Object.keys(updates).length === 0) throw new ToolError('No fields to update.');

			const [updated] = await db
				.update(projects)
				.set(updates)
				.where(eq(projects.id, projectId))
				.returning();
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'PROJECT',
				entityType: 'project',
				entityId: projectId,
				changeType: 'update',
				data: { before: existing, after: updated, source: 'mcp' },
			});
			return { success: true, project: updated };
		},
	},
	{
		name: 'delete_project',
		description:
			'Soft-deletes a project and its ships, archiving them to the deleted_projects/deleted_ships tables. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: { projectId: { type: 'integer' } },
			required: ['projectId'],
		},
		handler: async (args, ctx) => {
			const projectId = reqInt(args, 'projectId');
			const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
			if (!project) throw new ToolError(`No project with id ${projectId}.`);
			const projectShips = await db.select().from(ships).where(eq(ships.projectId, projectId));
			const deletedAt = new Date();

			await db.transaction(async (tx) => {
				await tx.insert(deletedProjects).values({
					originalId: project.id,
					userId: project.userId,
					title: project.title,
					description: project.description,
					coverArt: project.coverArt,
					category: project.category,
					hackatimeProjects: project.hackatimeProjects,
					hackatimeSeconds: project.hackatimeSeconds,
					githubUrl: project.githubUrl,
					demoUrl: project.demoUrl,
					createdAt: project.createdAt,
					deletedAt,
					deletedByUserId: ctx.actor.id,
				});
				if (projectShips.length) {
					await tx.insert(deletedShips).values(
						projectShips.map((ship) => ({
							originalId: ship.id,
							projectId: ship.projectId,
							userId: project.userId,
							seconds: ship.seconds,
							status: ship.status,
							submittedAt: ship.submittedAt,
							feedback: ship.feedback,
							deletedAt,
							deletedByUserId: ctx.actor.id,
						})),
					);
				}
				await tx.delete(ships).where(eq(ships.projectId, projectId));
				await tx.delete(projects).where(eq(projects.id, projectId));
				await recordAuditLog(tx, {
					actorUserId: ctx.actor.id,
					category: 'PROJECT',
					entityType: 'project',
					entityId: projectId,
					changeType: 'soft_delete',
					data: {
						title: project.title,
						deletedShipCount: projectShips.length,
						deletedShipIds: projectShips.map((s) => s.id),
						source: 'mcp',
					},
				});
			});
			return { success: true, deletedShipCount: projectShips.length };
		},
	},
	{
		name: 'create_shop_item',
		description: 'Create a new shop item. Audit-logged and announced to the shop updates channel.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				name: { type: 'string' },
				description: { type: 'string' },
				cost: { type: 'integer', description: 'Price in notes.' },
				imageUrl: { type: 'string' },
				categories: { type: 'array', items: { type: 'string' } },
			},
			required: ['name', 'cost'],
		},
		handler: async (args, ctx) => {
			const name = reqStr(args, 'name');
			const cost = reqInt(args, 'cost');
			const description = optStr(args, 'description') ?? '';
			const imageUrl = optStr(args, 'imageUrl') ?? '';
			const categories = Array.isArray(args.categories)
				? (args.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean)
				: [];

			const [item] = await db
				.insert(shopItems)
				.values({ name, description, cost, imageUrl, categories })
				.returning();
			await sendShopMessage(null, item);
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'SHOP_ITEM',
				entityType: 'shop_item',
				entityId: item.id,
				changeType: 'create',
				data: { before: null, after: item, source: 'mcp' },
			});
			return { success: true, item };
		},
	},
	{
		name: 'update_shop_item',
		description:
			'Update an existing shop item. Omitted fields are left unchanged. Audit-logged and announced to the shop updates channel.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				itemId: { type: 'integer' },
				name: { type: 'string' },
				description: { type: 'string' },
				cost: { type: 'integer' },
				imageUrl: { type: 'string' },
				categories: { type: 'array', items: { type: 'string' } },
			},
			required: ['itemId'],
		},
		handler: async (args, ctx) => {
			const itemId = reqInt(args, 'itemId');
			const [prevItem] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
			if (!prevItem) throw new ToolError(`No shop item with id ${itemId}.`);

			const updates: Partial<typeof shopItems.$inferInsert> = {};
			if (args.name !== undefined) updates.name = reqStr(args, 'name');
			if (args.description !== undefined) updates.description = optStr(args, 'description') ?? '';
			if (args.cost !== undefined) updates.cost = reqInt(args, 'cost');
			if (args.imageUrl !== undefined) updates.imageUrl = optStr(args, 'imageUrl') ?? '';
			if (args.categories !== undefined) {
				if (!Array.isArray(args.categories)) throw new ToolError('"categories" must be an array.');
				updates.categories = (args.categories as unknown[]).map((c) => String(c).trim()).filter(Boolean);
			}
			if (Object.keys(updates).length === 0) throw new ToolError('No fields to update.');

			const [item] = await db
				.update(shopItems)
				.set(updates)
				.where(eq(shopItems.id, itemId))
				.returning();
			await sendShopMessage(prevItem, item);
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: 'SHOP_ITEM',
				entityType: 'shop_item',
				entityId: item.id,
				changeType: 'update',
				data: { before: prevItem, after: item, source: 'mcp' },
			});
			return { success: true, item };
		},
	},
	{
		name: 'delete_shop_item',
		description:
			'Soft-deletes a shop item (archived to deleted_shop_items). Fails if any orders reference it. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: { itemId: { type: 'integer' } },
			required: ['itemId'],
		},
		handler: async (args, ctx) => {
			const itemId = reqInt(args, 'itemId');
			const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId));
			if (!item) throw new ToolError(`No shop item with id ${itemId}.`);
			const [orderCount] = await db
				.select({ value: count() })
				.from(orders)
				.where(eq(orders.itemId, itemId));
			if (orderCount.value > 0) throw new ToolError('Cannot delete an item with existing orders.');

			await db.transaction(async (tx) => {
				await tx.insert(deletedShopItems).values({
					originalId: item.id,
					name: item.name,
					description: item.description,
					cost: item.cost,
					imageUrl: item.imageUrl,
					categories: item.categories,
					deletedAt: new Date(),
					deletedByUserId: ctx.actor.id,
				});
				await tx.delete(shopItems).where(eq(shopItems.id, itemId));
				await recordAuditLog(tx, {
					actorUserId: ctx.actor.id,
					category: 'SHOP_ITEM',
					entityType: 'shop_item',
					entityId: itemId,
					changeType: 'soft_delete',
					data: { item, source: 'mcp' },
				});
			});
			await sendShopMessage(item, null);
			return { success: true };
		},
	},
	{
		name: 'update_order',
		description:
			'Update an order: set its status (pending/fulfilled) and/or its reference, adminNotes, and userNotes. Omitted fields are left unchanged. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				orderId: { type: 'integer' },
				status: { type: 'string', enum: ['PENDING', 'FULFILLED'] },
				reference: { type: 'string' },
				adminNotes: { type: 'string' },
				userNotes: { type: 'string' },
			},
			required: ['orderId'],
		},
		handler: async (args, ctx) => {
			const orderId = reqInt(args, 'orderId');
			const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
			if (!order) throw new ToolError(`No order with id ${orderId}.`);

			const updates: Partial<typeof orders.$inferInsert> = {};
			if (args.status !== undefined) {
				const status = reqStr(args, 'status');
				if (status !== 'PENDING' && status !== 'FULFILLED')
					throw new ToolError('"status" must be PENDING or FULFILLED.');
				updates.status = status;
				updates.fulfilledAt = status === 'FULFILLED' ? new Date() : null;
			}
			if (args.reference !== undefined) updates.reference = optStr(args, 'reference') || null;
			if (args.adminNotes !== undefined) updates.adminNotes = optStr(args, 'adminNotes') || null;
			if (args.userNotes !== undefined) updates.userNotes = optStr(args, 'userNotes') || null;
			if (Object.keys(updates).length === 0) throw new ToolError('No fields to update.');

			const [updated] = await db
				.update(orders)
				.set(updates)
				.where(eq(orders.id, orderId))
				.returning({
					id: orders.id,
					status: orders.status,
					reference: orders.reference,
					adminNotes: orders.adminNotes,
					userNotes: orders.userNotes,
					fulfilledAt: orders.fulfilledAt,
				});
			await recordAuditLog(db, {
				actorUserId: ctx.actor.id,
				category: args.status !== undefined ? 'FULFILL' : 'ORDER_INFO',
				entityType: 'order',
				entityId: orderId,
				changeType: 'update',
				data: {
					status: updates.status,
					reference: updates.reference,
					adminNotes: updates.adminNotes,
					userNotes: updates.userNotes,
					source: 'mcp',
				},
			});
			return { success: true, order: updated };
		},
	},
	{
		name: 'review_ship',
		description:
			'Drive the ship review workflow as the token\'s admin account. Actions: approve / reject / comment / internal_comment (reviewer stage), authorize / deauthorize (HQ stage), reverse_authorize (undo an HQ approval). Sends Slack DMs and adjusts balances exactly like the dashboard. Audit-logged.',
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				shipId: { type: 'integer' },
				action: {
					type: 'string',
					enum: [
						'approve',
						'reject',
						'comment',
						'internal_comment',
						'authorize',
						'deauthorize',
						'reverse_authorize',
					],
				},
				hoursAssigned: {
					type: 'number',
					description: 'For approve/authorize: hours credited (defaults to submitted hours).',
				},
				feedbackMessage: { type: 'string', description: 'User-facing feedback (approve/reject).' },
				justification: { type: 'string', description: 'Internal note (approve).' },
				internalMessage: { type: 'string', description: 'Internal note (reject).' },
				commentText: { type: 'string', description: 'Body for comment/internal_comment.' },
			},
			required: ['shipId', 'action'],
		},
		handler: async (args, ctx) => {
			const result = await performReviewAction({
				shipId: reqInt(args, 'shipId'),
				reviewerUserId: ctx.actor.id,
				actorId: ctx.actor.slackId,
				action: reqStr(args, 'action'),
				hoursAssigned: optNum(args, 'hoursAssigned'),
				feedbackMessage: optStr(args, 'feedbackMessage'),
				justification: optStr(args, 'justification'),
				internalMessage: optStr(args, 'internalMessage'),
				commentText: optStr(args, 'commentText'),
				source: 'mcp',
			});
			if (!result.ok) throw new ToolError(result.message);
			return { success: true, ...result.data };
		},
	},
	{
		name: 'update_review',
		description:
			"Edit the latest approval or rejection this admin made on a ship (feedback, internal note, or adjusted hours). Re-syncs the Slack DM when the user-facing feedback changes. Audit-logged.",
		mutates: true,
		inputSchema: {
			type: 'object',
			properties: {
				shipId: { type: 'integer' },
				type: { type: 'string', enum: ['approval', 'rejection'] },
				feedbackMessage: { type: 'string' },
				justification: { type: 'string' },
				internalMessage: { type: 'string' },
				hoursAssigned: { type: 'number' },
			},
			required: ['shipId', 'type'],
		},
		handler: async (args, ctx) => {
			const result = await performUpdateReview({
				shipId: reqInt(args, 'shipId'),
				reviewerUserId: ctx.actor.id,
				type: reqStr(args, 'type'),
				feedbackMessage: optStr(args, 'feedbackMessage'),
				justification: optStr(args, 'justification'),
				internalMessage: optStr(args, 'internalMessage'),
				hoursAssigned: optNum(args, 'hoursAssigned'),
				source: 'mcp',
			});
			if (!result.ok) throw new ToolError(result.message);
			return { success: true };
		},
	},
];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
