import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { projects, ships, shipReviews, users, shopItems, orders } from '$lib/server/db/schema';
import { eq, and, sql, desc, asc, inArray, or, ilike, count } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { decrypt } from '$lib/server/crypto';
import { performReviewAction, performUpdateReview } from '$lib/server/reviews';
import { HackatimeClient } from '$lib/server/hackatime';

const VERSION = '1.0.0';

function err(status: number, error: string, message: string) {
	return json({ error, message }, { status });
}

function mapShipStatus(status: string): 'pending' | 'pending_hq' | 'approved' | 'rejected' {
	switch (status) {
		case 'REVIEWER_APPROVED':
			return 'pending_hq';
		case 'APPROVED':
			return 'approved';
		case 'REJECTED':
			return 'rejected';
		default:
			return 'pending';
	}
}

function mapOrderStatus(status: string): 'pending' | 'fulfilled' | 'cancelled' {
	if (status === 'FULFILLED') return 'fulfilled';
	return 'pending';
}

function actorIdFromUser(user: { slackId: string; hcaId: string | null }): string {
	return user.slackId;
}

async function resolveActorId(actorId: string): Promise<number | null> {
	if (actorId.startsWith('ident!')) {
		const hcaId = actorId.slice(6);
		const user = await db.query.users.findFirst({ where: eq(users.hcaId, hcaId) });
		return user?.id ?? null;
	}
	const user = await db.query.users.findFirst({ where: eq(users.slackId, actorId) });
	return user?.id ?? null;
}

function formatProject(
	project: typeof projects.$inferSelect,
	user: { slackId: string; hcaId: string | null; hackatimeId: string | null },
	projectShips: (typeof ships.$inferSelect)[],
	reviewerApprovals?: Map<number, { reviewerId: string; adjustedHours: number; feedbackMessage: string; justification: string; timestamp: string }>,
) {
	return {
		id: String(project.id),
		title: project.title,
		description: project.description ?? '',
		codeUrl: project.githubUrl ?? '',
		demoUrl: project.demoUrl ?? undefined,
		screenshotUrl: project.coverArt ?? undefined,
		authorId: actorIdFromUser(user),
		hackatimeId: user.hackatimeId ?? undefined,
		hackatimeProjectKeys: project.hackatimeProjects,
		ships: projectShips.filter((s) => s.status !== 'CANCELLED').map((s) => {
			const base = {
				id: String(s.id),
				hoursSubmitted: s.seconds / 3600,
				submittedAt: s.submittedAt.toISOString(),
				status: mapShipStatus(s.status),
			};
			const approval = reviewerApprovals?.get(s.id);
			if (approval && s.status === 'REVIEWER_APPROVED') {
				return { ...base, reviewerApproval: approval };
			}
			return base;
		}),
		metadata: {},
	};
}

function formatShopItem(item: typeof shopItems.$inferSelect) {
	return {
		id: String(item.id),
		name: item.name,
		description: item.description ?? undefined,
		fulfillerContext: item.fulfillerContext ?? undefined,
		thumbnailUrl: item.imageUrl ?? undefined,
		unitPrice: item.cost,
		metadata: {},
	};
}

function formatOrder(
	order: typeof orders.$inferSelect,
	user: { slackId: string; username: string; email: string | null; avatarUrl: string | null },
) {
	return {
		id: String(order.id),
		userId: user.slackId,
		userName: user.username,
		userEmail: user.email ?? '',
		userAvatarUrl: user.avatarUrl ?? undefined,
		itemId: String(order.itemId),
		quantity: 1,
		totalPrice: undefined as number | undefined,
		status: mapOrderStatus(order.status),
		reference: order.reference ?? undefined,
		adminNotes: order.adminNotes ?? undefined,
		userNotes: order.userNotes ?? undefined,
		createdAt: order.createdAt.toISOString(),
		fulfilledAt: order.fulfilledAt?.toISOString() ?? undefined,
		metadata: {},
	};
}

async function fetchReviewerApprovals(shipIds: number[]) {
	if (shipIds.length === 0) return new Map<number, { reviewerId: string; adjustedHours: number; feedbackMessage: string; justification: string; timestamp: string }>();

	const approvals = await db
		.select({
			review: shipReviews,
			reviewer: { slackId: users.slackId, hcaId: users.hcaId },
		})
		.from(shipReviews)
		.innerJoin(users, eq(shipReviews.reviewerId, users.id))
		.where(and(inArray(shipReviews.shipId, shipIds), eq(shipReviews.type, 'APPROVAL')))
		.orderBy(desc(shipReviews.createdAt));

	const map = new Map<number, { reviewerId: string; adjustedHours: number; feedbackMessage: string; justification: string; timestamp: string }>();
	for (const { review, reviewer } of approvals) {
		if (!map.has(review.shipId)) {
			map.set(review.shipId, {
				reviewerId: actorIdFromUser(reviewer),
				adjustedHours: review.adjustedHours ?? 0,
				feedbackMessage: review.userComment ?? '',
				justification: review.internalComment ?? '',
				timestamp: review.createdAt.toISOString(),
			});
		}
	}
	return map;
}

async function resolveHackatimeIds(
	rows: { user: { slackId: string; hackatimeId: string | null; accessToken: string | null } }[],
) {
	const missing = rows.filter((r) => !r.user.hackatimeId);
	if (missing.length === 0) return;

	const resolved = new Map<string, string>();

	await Promise.allSettled(
		missing.map(async (r) => {
			if (resolved.has(r.user.slackId)) return;

			let htId: string | null = null;

			if (r.user.accessToken) {
				try {
					const token = decrypt(r.user.accessToken);
					const client = new HackatimeClient(token);
					const profile = await client.getProfile();
					htId = profile.id ? String(profile.id) : null;
				} catch {
					// fall through to Slack ID lookup
				}
			}

			if (!htId) {
				htId = await HackatimeClient.lookupSlackId(r.user.slackId);
			}

			if (htId) {
				resolved.set(r.user.slackId, htId);
				await db.update(users).set({ hackatimeId: htId }).where(eq(users.slackId, r.user.slackId));
			}
		}),
	);

	for (const row of rows) {
		if (!row.user.hackatimeId) {
			row.user.hackatimeId = resolved.get(row.user.slackId) ?? null;
		}
	}
}

async function healthCheck() {
	return json({ ok: true, version: VERSION });
}

async function getProgramStats() {
	const [pendingReview] = await db
		.select({ count: count() })
		.from(projects)
		.where(
			sql`EXISTS (SELECT 1 FROM ships WHERE ships.project_id = projects.id AND ships.status = 'PENDING')`,
		);

	const [pendingHq] = await db
		.select({ count: count() })
		.from(projects)
		.where(
			sql`EXISTS (SELECT 1 FROM ships WHERE ships.project_id = projects.id AND ships.status = 'REVIEWER_APPROVED')`,
		);

	const [pendingFulfillment] = await db
		.select({ count: count() })
		.from(orders)
		.where(eq(orders.status, 'PENDING'));

	return json({
		pendingReviewCount: pendingReview.count,
		pendingHqCount: pendingHq.count,
		pendingFulfillmentCount: pendingFulfillment.count,
	});
}

async function fetchProjects(input: { status?: string; cursor?: string; limit?: number }) {
	const limit = input.limit ?? 50;
	const cursorId = input.cursor ? Number(input.cursor) : 0;

	let statusFilter;
	if (input.status && input.status !== 'all') {
		const sidekickStatus = input.status;
		let dbStatuses: string[];
		if (sidekickStatus === 'pending') {
			dbStatuses = ['PENDING'];
		} else if (sidekickStatus === 'pending_hq') {
			dbStatuses = ['REVIEWER_APPROVED'];
		} else if (sidekickStatus === 'approved') {
			dbStatuses = ['APPROVED'];
		} else if (sidekickStatus === 'rejected') {
			dbStatuses = ['REJECTED'];
		} else {
			dbStatuses = [];
		}
		if (dbStatuses.length > 0) {
			const inList = sql.raw(dbStatuses.map((s) => `'${s}'`).join(', '));
			statusFilter = sql`EXISTS (SELECT 1 FROM ships WHERE ships.project_id = projects.id AND ships.status IN (${inList}))`;
		}
	}

	const conditions = [
		...(cursorId ? [sql`projects.id > ${cursorId}`] : []),
		...(statusFilter ? [statusFilter] : []),
	];

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const [totalResult] = await db
		.select({ count: count() })
		.from(projects)
		.where(statusFilter ?? undefined);

	const projectRows = await db
		.select({ project: projects, user: { slackId: users.slackId, hcaId: users.hcaId, hackatimeId: users.hackatimeId, accessToken: users.accessToken } })
		.from(projects)
		.innerJoin(users, eq(projects.userId, users.id))
		.where(whereClause)
		.orderBy(asc(projects.id))
		.limit(limit);

	if (projectRows.length === 0) {
		return json({ projects: [], totalCount: totalResult.count });
	}

	await resolveHackatimeIds(projectRows);

	const projectIds = projectRows.map((r) => r.project.id);
	const allShips = await db
		.select()
		.from(ships)
		.where(inArray(ships.projectId, projectIds))
		.orderBy(asc(ships.submittedAt));

	const shipsByProject = new Map<number, (typeof ships.$inferSelect)[]>();
	const reviewerApprovedShipIds: number[] = [];
	for (const ship of allShips) {
		const list = shipsByProject.get(ship.projectId) ?? [];
		list.push(ship);
		shipsByProject.set(ship.projectId, list);
		if (ship.status === 'REVIEWER_APPROVED') reviewerApprovedShipIds.push(ship.id);
	}

	const reviewerApprovals = await fetchReviewerApprovals(reviewerApprovedShipIds);

	const formatted = projectRows.map((r) =>
		formatProject(r.project, r.user, shipsByProject.get(r.project.id) ?? [], reviewerApprovals),
	);

	const lastId = projectRows[projectRows.length - 1].project.id;
	const hasMore = projectRows.length === limit;

	return json({
		projects: formatted,
		...(hasMore ? { nextCursor: String(lastId) } : {}),
		totalCount: totalResult.count,
	});
}

async function fetchProjectDetail(input: { projectId: string }) {
	const id = Number(input.projectId);
	const [row] = await db
		.select({ project: projects, user: { slackId: users.slackId, hcaId: users.hcaId, hackatimeId: users.hackatimeId, accessToken: users.accessToken } })
		.from(projects)
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(projects.id, id));

	if (!row) return err(404, 'NOT_FOUND', `No project found with ID ${input.projectId}.`);

	await resolveHackatimeIds([row]);

	const projectShips = await db
		.select()
		.from(ships)
		.where(eq(ships.projectId, id))
		.orderBy(asc(ships.submittedAt));

	const reviewerApprovedIds = projectShips
		.filter((s) => s.status === 'REVIEWER_APPROVED')
		.map((s) => s.id);
	const reviewerApprovals = await fetchReviewerApprovals(reviewerApprovedIds);

	return json(formatProject(row.project, row.user, projectShips, reviewerApprovals));
}

async function fetchProjectTimeline(input: { projectId: string }) {
	const projectId = Number(input.projectId);

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) return err(404, 'NOT_FOUND', `No project found with ID ${input.projectId}.`);

	const projectShips = await db
		.select()
		.from(ships)
		.where(and(eq(ships.projectId, projectId), sql`${ships.status} != 'CANCELLED'`))
		.orderBy(asc(ships.submittedAt));

	if (projectShips.length === 0) return json({ events: [] });

	const [projectAuthor] = await db
		.select({ slackId: users.slackId })
		.from(users)
		.where(eq(users.id, project.userId));

	const shipIds = projectShips.map((s) => s.id);
	const reviews = await db
		.select({
			review: shipReviews,
			reviewer: { slackId: users.slackId, hcaId: users.hcaId },
		})
		.from(shipReviews)
		.innerJoin(users, eq(shipReviews.reviewerId, users.id))
		.where(inArray(shipReviews.shipId, shipIds))
		.orderBy(asc(shipReviews.createdAt));

	type TimelineEvent = Record<string, unknown>;
	const events: TimelineEvent[] = [];

	for (const ship of projectShips) {
		events.push({
			type: 'ship',
			shipId: String(ship.id),
			actorId: projectAuthor.slackId,
			hoursSubmitted: ship.seconds / 3600,
			timestamp: ship.submittedAt.toISOString(),
		});
	}

	for (const { review, reviewer } of reviews) {
		const actorId = actorIdFromUser(reviewer);

		if (review.type === 'APPROVAL' || review.type === 'HQ_APPROVAL') {
			events.push({
				type: 'approval',
				shipId: String(review.shipId),
				actorId,
				hoursAssigned: review.adjustedHours ?? 0,
				feedbackMessage: review.userComment ?? '',
				justification: review.internalComment ?? '',
				timestamp: review.createdAt.toISOString(),
			});
		} else if (review.type === 'REJECTION' || review.type === 'HQ_REJECTION') {
			events.push({
				type: 'rejection',
				shipId: String(review.shipId),
				actorId,
				feedbackMessage: review.userComment ?? '',
				internalMessage: review.internalComment ?? undefined,
				timestamp: review.createdAt.toISOString(),
			});
		} else if (review.type === 'COMMENT') {
			events.push({
				type: 'comment',
				actorId,
				message: review.userComment ?? review.internalComment ?? '',
				isInternal: review.isInternal,
				timestamp: review.createdAt.toISOString(),
			});
		}
	}

	events.sort(
		(a, b) =>
			new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime(),
	);

	return json({ events });
}

async function submitReviewAction(input: {
	shipId: string;
	reviewerId: string;
	action: string;
	hoursAssigned?: number;
	feedbackMessage?: string;
	justification?: string;
	internalMessage?: string;
	commentText?: string;
}) {
	const reviewerUserId = await resolveActorId(input.reviewerId);
	if (reviewerUserId === null)
		return err(404, 'NOT_FOUND', `Reviewer ${input.reviewerId} not found.`);

	const result = await performReviewAction({
		shipId: Number(input.shipId),
		reviewerUserId,
		actorId: input.reviewerId,
		action: input.action,
		hoursAssigned: input.hoursAssigned,
		feedbackMessage: input.feedbackMessage,
		justification: input.justification,
		internalMessage: input.internalMessage,
		commentText: input.commentText,
		source: 'sidekick',
	});

	if (!result.ok) return err(result.status, result.error, result.message);

	if (result.data.reversedNotes !== undefined) {
		return json({ success: true, reversedNotes: result.data.reversedNotes });
	}
	return json({ success: true, event: result.data.event });
}

async function updateReviewAction(input: {
	shipId: string;
	reviewerId: string;
	type: string;
	feedbackMessage?: string;
	justification?: string;
	internalMessage?: string;
	hoursAssigned?: number;
}) {
	const reviewerUserId = await resolveActorId(input.reviewerId);
	if (reviewerUserId === null)
		return err(404, 'NOT_FOUND', `Reviewer ${input.reviewerId} not found.`);

	const result = await performUpdateReview({
		shipId: Number(input.shipId),
		reviewerUserId,
		type: input.type,
		feedbackMessage: input.feedbackMessage,
		justification: input.justification,
		internalMessage: input.internalMessage,
		hoursAssigned: input.hoursAssigned,
		source: 'sidekick',
	});

	if (!result.ok) return err(result.status, result.error, result.message);
	return json({ success: true });
}

async function fetchShopItems() {
	const items = await db.select().from(shopItems).orderBy(asc(shopItems.id));
	return json({ items: items.map(formatShopItem) });
}

async function fetchOrders(input: {
	status?: string;
	searchUser?: string;
	cursor?: string;
	limit?: number;
	sortBy?: string;
	sortOrder?: string;
}) {
	const limit = input.limit ?? 50;
	const cursorId = input.cursor ? Number(input.cursor) : 0;

	const conditions = [];

	if (input.status && input.status !== 'all') {
		const dbStatus = input.status === 'fulfilled' ? 'FULFILLED' : 'PENDING';
		conditions.push(eq(orders.status, dbStatus));
	}

	if (cursorId) {
		conditions.push(sql`${orders.id} > ${cursorId}`);
	}

	if (input.searchUser) {
		conditions.push(
			or(
				ilike(users.username, `%${input.searchUser}%`),
				ilike(users.email, `%${input.searchUser}%`),
			)!,
		);
	}

	const sortColumn = (() => {
		switch (input.sortBy) {
			case 'id':
				return orders.id;
			case 'user':
				return users.username;
			case 'item':
				return shopItems.name;
			case 'quantity':
				return orders.id;
			case 'status':
				return orders.status;
			default:
				return orders.createdAt;
		}
	})();
	const sortDir = input.sortOrder === 'desc' ? desc(sortColumn) : asc(sortColumn);

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const baseQuery = () =>
		db
			.select({
				order: orders,
				user: {
					slackId: users.slackId,
					username: users.username,
					email: users.email,
					avatarUrl: users.avatarUrl,
				},
				item: shopItems,
			})
			.from(orders)
			.innerJoin(users, eq(orders.userId, users.id))
			.innerJoin(shopItems, eq(orders.itemId, shopItems.id));

	const [totalResult] = await db
		.select({ count: count() })
		.from(orders)
		.innerJoin(users, eq(orders.userId, users.id))
		.where(whereClause);

	const rows = await baseQuery().where(whereClause).orderBy(sortDir).limit(limit);

	const itemsMap: Record<string, ReturnType<typeof formatShopItem>> = {};
	for (const r of rows) {
		itemsMap[String(r.item.id)] = formatShopItem(r.item);
	}

	const formattedOrders = rows.map((r) => {
		const o = formatOrder(r.order, r.user);
		o.totalPrice = r.item.cost;
		return o;
	});

	const hasMore = rows.length === limit;
	const lastId = rows.length > 0 ? rows[rows.length - 1].order.id : null;

	return json({
		orders: formattedOrders,
		items: itemsMap,
		...(hasMore && lastId ? { nextCursor: String(lastId) } : {}),
		totalCount: totalResult.count,
	});
}

async function fetchOrderDetail(input: { orderId: string }) {
	const id = Number(input.orderId);
	const [row] = await db
		.select({
			order: orders,
			user: {
				slackId: users.slackId,
				username: users.username,
				email: users.email,
				avatarUrl: users.avatarUrl,
			},
		})
		.from(orders)
		.innerJoin(users, eq(orders.userId, users.id))
		.where(eq(orders.id, id));

	if (!row) return err(404, 'NOT_FOUND', `No order found with ID ${input.orderId}.`);

	const [item] = await db.select().from(shopItems).where(eq(shopItems.id, row.order.itemId));

	const o = formatOrder(row.order, row.user);
	if (item) o.totalPrice = item.cost;

	return json({
		order: o,
		item: item ? formatShopItem(item) : null,
	});
}

async function revealOrderAddress(input: { orderId: string }) {
	const id = Number(input.orderId);
	const [order] = await db.select().from(orders).where(eq(orders.id, id));
	if (!order) return err(404, 'NOT_FOUND', `No order found with ID ${input.orderId}.`);

	const nameParts = decrypt(order.fullName).split(' ');
	const firstName = nameParts[0] ?? '';
	const lastName = nameParts.slice(1).join(' ') || '';

	return json({
		firstName,
		lastName,
		line1: decrypt(order.addressLine1),
		line2: order.addressLine2 ? decrypt(order.addressLine2) : undefined,
		city: decrypt(order.city),
		stateProvince: decrypt(order.state),
		postalCode: decrypt(order.zipCode),
		country: decrypt(order.country),
	});
}

async function updateOrderStatus(input: {
	orderId: string;
	newStatus: string;
	reference?: string;
}) {
	const id = Number(input.orderId);
	const [order] = await db.select().from(orders).where(eq(orders.id, id));
	if (!order) return err(404, 'NOT_FOUND', `No order found with ID ${input.orderId}.`);

	const dbStatus = input.newStatus === 'fulfilled' ? 'FULFILLED' : 'PENDING';

	const updates: Partial<typeof orders.$inferInsert> = { status: dbStatus };
	if (input.reference !== undefined) updates.reference = input.reference;
	if (dbStatus === 'FULFILLED') updates.fulfilledAt = new Date();
	if (dbStatus === 'PENDING') updates.fulfilledAt = null;

	await db.update(orders).set(updates).where(eq(orders.id, id));

	return json({ success: true });
}

async function updateOrderFields(input: {
	orderId: string;
	reference?: string;
	adminNotes?: string;
	userNotes?: string;
}) {
	const id = Number(input.orderId);
	const [order] = await db.select().from(orders).where(eq(orders.id, id));
	if (!order) return err(404, 'NOT_FOUND', `No order found with ID ${input.orderId}.`);

	const updates: Partial<typeof orders.$inferInsert> = {};
	if (input.reference !== undefined) updates.reference = input.reference;
	if (input.adminNotes !== undefined) updates.adminNotes = input.adminNotes;
	if (input.userNotes !== undefined) updates.userNotes = input.userNotes;

	if (Object.keys(updates).length > 0) {
		await db.update(orders).set(updates).where(eq(orders.id, id));
	}

	return json({ success: true });
}

async function updateItemFields(input: { itemId: string; fulfillerContext?: string }) {
	const id = Number(input.itemId);
	const [item] = await db.select().from(shopItems).where(eq(shopItems.id, id));
	if (!item) return err(404, 'NOT_FOUND', `No item found with ID ${input.itemId}.`);

	if (input.fulfillerContext !== undefined) {
		await db
			.update(shopItems)
			.set({ fulfillerContext: input.fulfillerContext })
			.where(eq(shopItems.id, id));
	}

	return json({ success: true });
}

export const POST: RequestHandler = async ({ request }) => {
	const authHeader = request.headers.get('Authorization');
	if (!env.SIDEKICK_SECRET || authHeader !== `Bearer ${env.SIDEKICK_SECRET}`) {
		return err(401, 'UNAUTHORIZED', 'Invalid or missing secret.');
	}

	let body: { action: string; input: Record<string, unknown> };
	try {
		body = await request.json();
	} catch {
		return err(400, 'VALIDATION_ERROR', 'Invalid JSON body.');
	}

	const { action, input } = body;

	switch (action) {
		case 'HEALTH_CHECK':
			return healthCheck();
		case 'GET_PROGRAM_STATS':
			return getProgramStats();
		case 'FETCH_PROJECTS':
			return fetchProjects(input as Parameters<typeof fetchProjects>[0]);
		case 'FETCH_PROJECT_DETAIL':
			return fetchProjectDetail(input as Parameters<typeof fetchProjectDetail>[0]);
		case 'FETCH_PROJECT_TIMELINE':
			return fetchProjectTimeline(input as Parameters<typeof fetchProjectTimeline>[0]);
		case 'SUBMIT_REVIEW_ACTION':
			return submitReviewAction(input as Parameters<typeof submitReviewAction>[0]);
		case 'UPDATE_REVIEW_ACTION':
			return updateReviewAction(input as Parameters<typeof updateReviewAction>[0]);
		case 'FETCH_SHOP_ITEMS':
			return fetchShopItems();
		case 'FETCH_ORDERS':
			return fetchOrders(input as Parameters<typeof fetchOrders>[0]);
		case 'FETCH_ORDER_DETAIL':
			return fetchOrderDetail(input as Parameters<typeof fetchOrderDetail>[0]);
		case 'REVEAL_ORDER_ADDRESS':
			return revealOrderAddress(input as Parameters<typeof revealOrderAddress>[0]);
		case 'UPDATE_ORDER_STATUS':
			return updateOrderStatus(input as Parameters<typeof updateOrderStatus>[0]);
		case 'UPDATE_ORDER_FIELDS':
			return updateOrderFields(input as Parameters<typeof updateOrderFields>[0]);
		case 'UPDATE_ITEM_FIELDS':
			return updateItemFields(input as Parameters<typeof updateItemFields>[0]);
		default:
			return err(400, 'INVALID_ACTION', `Unknown action: ${action}`);
	}
};
