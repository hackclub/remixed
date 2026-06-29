import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import {
	notesLedger,
	orders,
	projects,
	shipReviews,
	shipSuggestions,
	ships,
	shopItems,
	users,
} from '$lib/server/db/schema';
import { and, eq, inArray, desc, sql, isNotNull } from 'drizzle-orm';
import { sendMessage } from '$lib/server/slack/send_message';
import { sendReviewDM } from '$lib/server/slack/review_message';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';
import { createAirtableShipRecord, extractGithubUsername } from '$lib/server/airtable';
import { decrypt } from '$lib/server/crypto';
import { uploadToS3, getPublicUrl } from '$lib/server/s3';
import { NOTES_PER_HOUR, MIN_NOTES_PER_HOUR, MAX_NOTES_PER_HOUR, formatHours } from '$lib';

const decryptOrNull = (val: string | null) => (val ? decrypt(val) : null);

export const load: PageServerLoad = async () => {
	const pendingHqShips = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.status, 'REVIEWER_APPROVED'))
		.orderBy(ships.submittedAt);

	const shipIds = pendingHqShips.map((s) => s.ship.id);
	// A pending-HQ ship carries a reviewer *suggestion* (not yet a review) for HQ
	// to authorize or discard.
	const suggestionRows =
		shipIds.length > 0
			? await db
					.select({
						review: shipSuggestions,
						reviewer: { id: users.id, username: users.username },
					})
					.from(shipSuggestions)
					.innerJoin(users, eq(shipSuggestions.reviewerId, users.id))
					.where(inArray(shipSuggestions.shipId, shipIds))
					.orderBy(desc(shipSuggestions.createdAt))
			: [];

	const latestApprovalByShip = new Map<number, (typeof suggestionRows)[number]>();
	for (const r of suggestionRows) {
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
		const notesPerHour = Number(data.get('notesPerHour') ?? NOTES_PER_HOUR);
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();

		if (!Number.isFinite(shipId) || shipId <= 0) {
			return fail(400, { error: 'Invalid ship id' });
		}

		if (
			!Number.isFinite(notesPerHour) ||
			notesPerHour < MIN_NOTES_PER_HOUR ||
			notesPerHour > MAX_NOTES_PER_HOUR
		) {
			return fail(400, {
				error: `Notes per hour must be between ${MIN_NOTES_PER_HOUR} and ${MAX_NOTES_PER_HOUR}`,
			});
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
		if (adjustedHours <= 0 || adjustedHours > maxHours + 0.1) {
			return fail(400, { error: `Hours must be between 0 and ${maxHours.toFixed(1)}` });
		}

		const notesPayout = Math.ceil(adjustedHours * notesPerHour);

		// The reviewer's suggestion is materialized into a real APPROVAL review here,
		// when HQ acts on it.
		const [suggestionRow] = await db
			.select({ suggestion: shipSuggestions })
			.from(shipSuggestions)
			.where(eq(shipSuggestions.shipId, shipId))
			.orderBy(desc(shipSuggestions.createdAt))
			.limit(1);

		const outcome = await db.transaction(async (tx) => {
			const [approvedShip] = await tx
				.update(ships)
				.set({ status: 'APPROVED', feedback: userComment })
				.where(and(eq(ships.id, shipId), eq(ships.status, 'REVIEWER_APPROVED')))
				.returning({ id: ships.id });

			if (!approvedShip) {
				return { conflict: true as const };
			}

			if (suggestionRow) {
				const suggestion = suggestionRow.suggestion;
				await tx.insert(shipReviews).values({
					shipId,
					reviewerId: suggestion.reviewerId,
					type: 'APPROVAL',
					userComment: suggestion.userComment,
					internalComment: suggestion.internalComment,
					adjustedHours: suggestion.adjustedHours,
					notesPerHour: suggestion.notesPerHour,
					createdAt: suggestion.createdAt,
					updatedAt: suggestion.updatedAt,
				});
				await tx.delete(shipSuggestions).where(eq(shipSuggestions.id, suggestion.id));
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
					notesPerHour,
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
					data: { adjustedHours, notesPerHour, notesPayout, userComment, internalComment },
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

		// Build enriched hour justification for Airtable
		const totalShipTime = formatHours(shipInfo.ship.seconds);
		const adjustedTime = `${Math.floor(adjustedHours)}h ${Math.round((adjustedHours % 1) * 60)}m`;
		const shipDate = shipInfo.ship.submittedAt.toISOString().slice(0, 10);
		const reviewDate = new Date().toISOString().slice(0, 10);
		const hackatimeProjectsList = shipInfo.project.hackatimeProjects.join(', ') || 'None';

		// Find the initial reviewer
		const [initialReview] = await db
			.select({ reviewer: { username: users.username } })
			.from(shipReviews)
			.innerJoin(users, eq(shipReviews.reviewerId, users.id))
			.where(and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'APPROVAL')))
			.orderBy(desc(shipReviews.createdAt))
			.limit(1);

		const reviewerName = initialReview?.reviewer.username ?? 'Unknown';
		const hqReviewerName = locals.user!.username;

		const enrichedJustification = [
			`This user tracked ${totalShipTime} on Hackatime. This was adjusted to ${adjustedTime} after review.`,
			'',
			internalComment,
			'',
			`Project was submitted by ${shipInfo.user.username} on ${shipDate}`,
			`The Hackatime projects submitted were: ${hackatimeProjectsList} and included time from 2026-03-07 to ${shipDate}`,
			`Project was reviewed by ${reviewerName} on ${reviewDate}.`,
			`Project was HQ approved by ${hqReviewerName} on ${reviewDate}.`,
		].join('\n');

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
				addressLine1: decryptOrNull(shipInfo.user.addressLine1),
				addressLine2: decryptOrNull(shipInfo.user.addressLine2),
				city: decryptOrNull(shipInfo.user.city),
				state: decryptOrNull(shipInfo.user.state),
				country: decryptOrNull(shipInfo.user.country),
				zipCode: decryptOrNull(shipInfo.user.zipCode),
				birthday: decryptOrNull(shipInfo.user.birthday),
				overrideHoursSpent: adjustedHours,
				overrideHoursJustification: enrichedJustification,
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
			.where(and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'HQ_APPROVAL')));

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
			addressLine1: decryptOrNull(shipInfo.user.addressLine1),
			addressLine2: decryptOrNull(shipInfo.user.addressLine2),
			city: decryptOrNull(shipInfo.user.city),
			state: decryptOrNull(shipInfo.user.state),
			country: decryptOrNull(shipInfo.user.country),
			zipCode: decryptOrNull(shipInfo.user.zipCode),
			birthday: decryptOrNull(shipInfo.user.birthday),
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
				.where(and(eq(notesLedger.refId, shipId), eq(notesLedger.reason, 'ship_approved')));
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
						.where(and(eq(orders.userId, shipInfo.user.id), eq(orders.status, 'PENDING')))
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
	backfillScreenshots: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		// Fetch all projects that have a cover art URL not already on our R2 bucket
		const allProjects = await db
			.select({ id: projects.id, coverArt: projects.coverArt })
			.from(projects)
			.where(isNotNull(projects.coverArt));

		const { env } = await import('$env/dynamic/private');
		const publicUrlBase = env.S3_PUBLIC_URL ?? '';

		const toMigrate = allProjects.filter(
			(p) => p.coverArt && !p.coverArt.startsWith(publicUrlBase),
		);

		let succeeded = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const project of toMigrate) {
			const rawUrl = project.coverArt!;
			try {
				const resp = await fetch(rawUrl);
				if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

				const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
				const extMap: Record<string, string> = {
					'image/jpeg': 'jpg',
					'image/png': 'png',
					'image/gif': 'gif',
					'image/webp': 'webp',
					'image/avif': 'avif',
				};
				const baseType = contentType.split(';')[0].trim();
				const ext = extMap[baseType] ?? 'jpg';
				const key = `screenshots/${project.id}-backfill.${ext}`;

				const bytes = new Uint8Array(await resp.arrayBuffer());
				await uploadToS3(key, bytes, baseType);
				const newUrl = getPublicUrl(key);

				await db.update(projects).set({ coverArt: newUrl }).where(eq(projects.id, project.id));

				succeeded++;
			} catch (err) {
				failed++;
				errors.push(`Project ${project.id}: ${err}`);
				console.error(`Screenshot backfill failed for project ${project.id}:`, err);
			}
		}

		return { backfillResult: { total: toMigrate.length, succeeded, failed, errors } };
	},
	backfillHackatimeIds: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Unauthorized' });

		const { HackatimeClient } = await import('$lib/server/hackatime');

		const usersToBackfill = await db
			.select({ id: users.id, accessToken: users.accessToken })
			.from(users)
			.where(and(isNotNull(users.accessToken), sql`${users.hackatimeId} IS NULL`));

		let succeeded = 0;
		let failed = 0;
		const errors: string[] = [];

		for (const user of usersToBackfill) {
			try {
				const token = decrypt(user.accessToken!);
				const client = new HackatimeClient(token);
				const profile = await client.getProfile();

				if (profile.id) {
					await db
						.update(users)
						.set({ hackatimeId: String(profile.id) })
						.where(eq(users.id, user.id));
					succeeded++;
				} else {
					failed++;
					errors.push(`User ${user.id}: no id in profile response`);
				}
			} catch (err) {
				failed++;
				errors.push(`User ${user.id}: ${err}`);
				console.error(`Hackatime ID backfill failed for user ${user.id}:`, err);
			}
		}

		return {
			backfillHackatimeResult: { total: usersToBackfill.length, succeeded, failed, errors },
		};
	},
	hqReject: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));

		const [ship] = await db.select().from(ships).where(eq(ships.id, shipId));

		if (!ship || ship.status !== 'REVIEWER_APPROVED') {
			return fail(400, { error: 'Ship not available for HQ rejection' });
		}

		// Discarding the suggestion returns the ship to the review queue. It is not a
		// rejection, so no review/timeline event is created.
		await Promise.all([
			db.update(ships).set({ status: 'PENDING', feedback: null }).where(eq(ships.id, shipId)),
			db.delete(shipSuggestions).where(eq(shipSuggestions.shipId, shipId)),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'discard_suggestion',
				data: {},
			}),
		]);
	},
};
