import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import {
	notesLedger,
	orders,
	projects,
	shipReviews,
	ships,
	shopItems,
	users,
} from '$lib/server/db/schema';
import { and, eq, inArray, desc, sql } from 'drizzle-orm';
import { sendMessage } from '$lib/server/slack/send_message';
import { sendReviewDM } from '$lib/server/slack/review_message';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';
import { createAirtableShipRecord, extractGithubUsername } from '$lib/server/airtable';
import { NOTES_PER_HOUR } from '$lib';

export const load: PageServerLoad = async () => {
	const pendingHqShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, 'REVIEWER_APPROVED'))
		.orderBy(ships.submittedAt);

	const shipIds = pendingHqShips.map((s) => s.ship.id);
	const approvalReviews =
		shipIds.length > 0
			? await db
					.select({
						review: shipReviews,
						reviewer: { id: users.id, username: users.username },
					})
					.from(shipReviews)
					.innerJoin(users, eq(shipReviews.reviewerId, users.id))
					.where(
						and(inArray(shipReviews.shipId, shipIds), eq(shipReviews.type, 'APPROVAL')),
					)
					.orderBy(desc(shipReviews.createdAt))
			: [];

	const latestApprovalByShip = new Map<
		number,
		(typeof approvalReviews)[number]
	>();
	for (const r of approvalReviews) {
		if (!latestApprovalByShip.has(r.review.shipId)) {
			latestApprovalByShip.set(r.review.shipId, r);
		}
	}

	// Find old approved ships that were never sent to Airtable
	// (i.e., approved ships with no HQ_APPROVAL review record)
	const allApprovedShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, 'APPROVED'))
		.orderBy(ships.submittedAt);

	const approvedShipIds = allApprovedShips.map((s) => s.ship.id);
	const hqApprovalShipIds = new Set(
		approvedShipIds.length > 0
			? (
					await db
						.select({ shipId: shipReviews.shipId })
						.from(shipReviews)
						.where(
							and(
								inArray(shipReviews.shipId, approvedShipIds),
								eq(shipReviews.type, 'HQ_APPROVAL'),
							),
						)
				).map((r) => r.shipId)
			: [],
	);

	const legacyApprovedShips = allApprovedShips.map((s) => ({
		...s,
		airtableSynced: hqApprovalShipIds.has(s.ship.id),
	}));

	return {
		ships: pendingHqShips.map((s) => ({
			...s,
			approval: latestApprovalByShip.get(s.ship.id) ?? null,
		})),
		legacyApprovedShips,
		notesPerHour: NOTES_PER_HOUR,
	};
};

export const actions: Actions = {
	hqApprove: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const adjustedHours = Number(data.get('adjustedHours'));
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();

		if (!Number.isFinite(shipId) || shipId <= 0) {
			return fail(400, { error: 'Invalid ship id' });
		}

		if (!userComment || !internalComment) {
			return fail(400, { error: 'Both user and internal comments are required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'REVIEWER_APPROVED') {
			return fail(400, { error: 'Ship not available for HQ approval' });
		}

		const maxHours = shipInfo.ship.seconds / 3600;
		if (adjustedHours <= 0 || adjustedHours > maxHours + 0.01) {
			return fail(400, { error: `Hours must be between 0 and ${maxHours.toFixed(1)}` });
		}

		const notesPayout = Math.ceil(adjustedHours * NOTES_PER_HOUR);

		const outcome = await db.transaction(async (tx) => {
			const [approvedShip] = await tx
				.update(ships)
				.set({ status: 'APPROVED', feedback: userComment })
				.where(and(eq(ships.id, shipId), eq(ships.status, 'REVIEWER_APPROVED')))
				.returning({ id: ships.id });

			if (!approvedShip) {
				return { conflict: true as const };
			}

			const [reviewRow] = await tx
				.insert(shipReviews)
				.values({
					shipId,
					reviewerId: locals.user!.id,
					type: 'HQ_APPROVAL',
					userComment,
					internalComment,
					adjustedHours,
					slackMessageTs: null,
					slackChannelId: null,
				})
				.returning({ id: shipReviews.id });

			await tx
				.update(projects)
				.set({ committedSeconds: sql`${projects.committedSeconds} + ${shipInfo.ship.seconds}` })
				.where(eq(projects.id, shipInfo.project.id));

			const [updatedUser] = await tx
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} + ${notesPayout}` })
				.where(eq(users.id, shipInfo.user.id))
				.returning({ notesBalance: users.notesBalance });

			await Promise.all([
				tx.insert(notesLedger).values({
					userId: shipInfo.user.id,
					delta: notesPayout,
					reason: 'ship_approved',
					refId: shipId,
				}),
				recordAuditLog(tx, {
					actorUserId: locals.user!.id,
					category: 'SHIP_REVIEW',
					entityType: 'ship',
					entityId: shipId,
					changeType: 'hq_approve',
					data: { adjustedHours, notesPayout, userComment, internalComment },
				}),
			]);

			return {
				conflict: false as const,
				reviewId: reviewRow.id,
				oldBalance: updatedUser.notesBalance - notesPayout,
				newBalance: updatedUser.notesBalance,
			};
		});

		if (outcome.conflict) {
			return fail(409, { error: 'Ship was already processed by another reviewer' });
		}

		const slackResult = await sendReviewDM(
			shipInfo.user.slackId,
			shipInfo.project.title,
			shipInfo.project.id,
			'approved',
			userComment,
		);

		if (slackResult.ts && slackResult.channel) {
			await db
				.update(shipReviews)
				.set({ slackMessageTs: slackResult.ts, slackChannelId: slackResult.channel })
				.where(eq(shipReviews.id, outcome.reviewId));
		}

		await Promise.all([
			sendUpdatedBalance(shipInfo.user.slackId, outcome.oldBalance, outcome.newBalance),
			createAirtableShipRecord({
				codeUrl: shipInfo.project.githubUrl,
				playableUrl: shipInfo.project.demoUrl,
				firstName: shipInfo.user.firstName,
				lastName: shipInfo.user.lastName,
				email: shipInfo.user.email,
				screenshot: shipInfo.project.coverArt,
				description: shipInfo.project.description,
				githubUsername: extractGithubUsername(shipInfo.project.githubUrl),
				addressLine1: shipInfo.user.addressLine1,
				addressLine2: shipInfo.user.addressLine2,
				city: shipInfo.user.city,
				state: shipInfo.user.state,
				country: shipInfo.user.country,
				zipCode: shipInfo.user.zipCode,
				birthday: shipInfo.user.birthday,
				overrideHoursSpent: adjustedHours,
				overrideHoursJustification: internalComment,
			}),
		]);
	},
	backfillAirtable: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const justification = (data.get('justification') as string).trim();

		if (!Number.isFinite(shipId) || shipId <= 0) {
			return fail(400, { error: 'Invalid ship id' });
		}
		if (!justification) {
			return fail(400, { error: 'Justification is required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'APPROVED') {
			return fail(400, { error: 'Ship not found or not approved' });
		}

		const hours = parseFloat((shipInfo.ship.seconds / 3600).toFixed(1));

		// Only create the HQ_APPROVAL review record if one doesn't already exist
		const existing = await db
			.select({ id: shipReviews.id })
			.from(shipReviews)
			.where(
				and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'HQ_APPROVAL')),
			);

		if (existing.length === 0) {
			await db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'HQ_APPROVAL',
				userComment: 'Backfilled from legacy approval',
				internalComment: justification,
				adjustedHours: hours,
			});
		}

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHIP_REVIEW',
			entityType: 'ship',
			entityId: shipId,
			changeType: 'backfill_airtable',
			data: { hours, justification },
		});

		await createAirtableShipRecord({
			codeUrl: shipInfo.project.githubUrl,
			playableUrl: shipInfo.project.demoUrl,
			firstName: shipInfo.user.firstName,
			lastName: shipInfo.user.lastName,
			email: shipInfo.user.email,
			screenshot: shipInfo.project.coverArt,
			description: shipInfo.project.description,
			githubUsername: extractGithubUsername(shipInfo.project.githubUrl),
			addressLine1: shipInfo.user.addressLine1,
			addressLine2: shipInfo.user.addressLine2,
			city: shipInfo.user.city,
			state: shipInfo.user.state,
			country: shipInfo.user.country,
			zipCode: shipInfo.user.zipCode,
			birthday: shipInfo.user.birthday,
			overrideHoursSpent: hours,
			overrideHoursJustification: justification,
		});
	},
	revokeLegacyShip: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const reason = (data.get('reason') as string).trim();

		if (!Number.isFinite(shipId) || shipId <= 0) {
			return fail(400, { error: 'Invalid ship id' });
		}
		if (!reason) {
			return fail(400, { error: 'Reason is required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'APPROVED') {
			return fail(400, { error: 'Ship not found or not approved' });
		}

		const outcome = await db.transaction(async (tx) => {
			// Find how many notes were awarded for this ship
			const awardedRows = await tx
				.select({ delta: notesLedger.delta })
				.from(notesLedger)
				.where(
					and(eq(notesLedger.refId, shipId), eq(notesLedger.reason, 'ship_approved')),
				);
			const awardedNotes = awardedRows.reduce((sum, row) => sum + row.delta, 0);

			// Cancel the ship
			await tx
				.update(ships)
				.set({ status: 'CANCELLED', feedback: `Revoked: ${reason}` })
				.where(eq(ships.id, shipId));

			// Restore committed seconds
			await tx
				.update(projects)
				.set({
					committedSeconds: sql`GREATEST(${projects.committedSeconds} - ${shipInfo.ship.seconds}, 0)`,
				})
				.where(eq(projects.id, shipInfo.project.id));

			let cancelledOrders: { orderId: number; itemName: string; cost: number }[] = [];

			if (awardedNotes > 0) {
				// Deduct notes
				const [updatedUser] = await tx
					.update(users)
					.set({ notesBalance: sql`${users.notesBalance} - ${awardedNotes}` })
					.where(eq(users.id, shipInfo.user.id))
					.returning({ notesBalance: users.notesBalance });

				await tx.insert(notesLedger).values({
					userId: shipInfo.user.id,
					delta: -awardedNotes,
					reason: 'ship_revoked',
					refId: shipId,
				});

				// If balance went negative, cancel pending orders until it's non-negative
				if (updatedUser.notesBalance < 0) {
					const pendingOrders = await tx
						.select({ order: orders, item: shopItems })
						.from(orders)
						.innerJoin(shopItems, eq(orders.itemId, shopItems.id))
						.where(
							and(
								eq(orders.userId, shipInfo.user.id),
								eq(orders.status, 'PENDING'),
							),
						)
						.orderBy(desc(orders.createdAt));

					let balance = updatedUser.notesBalance;
					for (const { order, item } of pendingOrders) {
						if (balance >= 0) break;

						await tx
							.update(orders)
							.set({ status: 'FULFILLED' }) // no CANCELLED status exists, mark fulfilled
							.where(eq(orders.id, order.id));

						// Refund the order cost
						await tx
							.update(users)
							.set({ notesBalance: sql`${users.notesBalance} + ${item.cost}` })
							.where(eq(users.id, shipInfo.user.id));

						await tx.insert(notesLedger).values({
							userId: shipInfo.user.id,
							delta: item.cost,
							reason: 'order_cancelled_revoke',
							refId: order.id,
						});

						cancelledOrders.push({
							orderId: order.id,
							itemName: item.name,
							cost: item.cost,
						});
						balance += item.cost;
					}
				}
			}

			return { awardedNotes, cancelledOrders };
		});

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHIP_REVIEW',
			entityType: 'ship',
			entityId: shipId,
			changeType: 'revoke_legacy_ship',
			data: {
				reason,
				awardedNotes: outcome.awardedNotes,
				cancelledOrders: outcome.cancelledOrders,
			},
		});

		// Notify the user via Slack
		const cancelledOrderLines = outcome.cancelledOrders
			.map((o) => `  • Order #${o.orderId} (${o.itemName}, ${o.cost} notes) — cancelled & refunded`)
			.join('\n');

		let message = `Your ship for *${shipInfo.project.title}* has been revoked.\n_Reason: ${reason}_`;
		if (outcome.awardedNotes > 0) {
			message += `\n\n*${outcome.awardedNotes} notes* have been deducted from your balance.`;
		}
		if (cancelledOrderLines) {
			message += `\n\nThe following pending orders were cancelled:\n${cancelledOrderLines}`;
		}

		await sendMessage(shipInfo.user.slackId, message);
	},
	hqReject: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const internalComment = (data.get('internalComment') as string).trim();

		if (!internalComment) {
			return fail(400, { error: 'Internal comment is required' });
		}

		const [ship] = await db.select().from(ships).where(eq(ships.id, shipId));

		if (!ship || ship.status !== 'REVIEWER_APPROVED') {
			return fail(400, { error: 'Ship not available for HQ rejection' });
		}

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'PENDING', feedback: null })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'HQ_REJECTION',
				internalComment,
				isInternal: true,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'hq_reject',
				data: { internalComment },
			}),
		]);
	},
};
