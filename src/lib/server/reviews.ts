import { db } from '$lib/server/db';
import {
	projects,
	ships,
	shipReviews,
	shipSuggestions,
	users,
	notesLedger,
} from '$lib/server/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { decrypt } from '$lib/server/crypto';
import { recordAuditLog } from '$lib/server/audit';
import { NOTES_PER_HOUR, MIN_NOTES_PER_HOUR, MAX_NOTES_PER_HOUR, formatHours } from '$lib';
import { sendReviewDM } from '$lib/server/slack/review_message';
import { sendUpdatedBalance } from '$lib/server/slack/send_updated_balance';
import { sendMessage, deleteMessage, findAndDeleteMessages } from '$lib/server/slack/send_message';
import { createAirtableShipRecord, extractGithubUsername } from '$lib/server/airtable';

const decryptOrNull = (val: string | null) => (val ? decrypt(val) : null);

/**
 * Result of a review operation. `ok: false` carries an HTTP-flavored status so
 * callers (the Sidekick HTTP endpoint, the admin MCP) can map it to their own
 * transport without re-deriving the failure mode.
 */
export type ReviewResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; error: string; message: string };

const fail = (status: number, error: string, message: string): ReviewResult<never> => ({
	ok: false,
	status,
	error,
	message,
});

export type ReviewActionInput = {
	shipId: number;
	/** Resolved DB id of the reviewer acting on the ship. */
	reviewerUserId: number;
	/** Stable identifier echoed back in timeline events (typically a Slack ID). */
	actorId: string;
	action: string;
	hoursAssigned?: number;
	/** Notes awarded per approved hour. Chosen by the reviewer when approving. */
	notesPerHour?: number;
	feedbackMessage?: string;
	justification?: string;
	internalMessage?: string;
	commentText?: string;
	/** Recorded on audit logs so we can tell where a change originated. */
	source?: string;
};

export type ReviewEvent = Record<string, unknown>;

/**
 * Drives the ship review state machine: reviewer approve/reject/comment, HQ
 * authorize/deauthorize, and reversal of an HQ approval. Mirrors the behavior
 * relied upon by the Sidekick integration and the admin MCP.
 */
export async function performReviewAction(
	input: ReviewActionInput,
): Promise<ReviewResult<{ event?: ReviewEvent; reversedNotes?: number }>> {
	const shipId = input.shipId;
	const reviewerUserId = input.reviewerUserId;
	const source = input.source ?? 'sidekick';

	const [shipInfo] = await db
		.select({ ship: ships, project: projects, user: users })
		.from(ships)
		.innerJoin(projects, eq(ships.projectId, projects.id))
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(ships.id, shipId));

	if (!shipInfo) return fail(404, 'NOT_FOUND', `Ship ${shipId} not found.`);

	if (input.action === 'approve') {
		if (shipInfo.ship.status !== 'PENDING')
			return fail(400, 'VALIDATION_ERROR', 'Ship is not pending review.');

		const hoursAssigned = input.hoursAssigned ?? shipInfo.ship.seconds / 3600;
		const maxHours = shipInfo.ship.seconds / 3600;
		if (hoursAssigned <= 0 || hoursAssigned > maxHours + 0.1)
			return fail(400, 'VALIDATION_ERROR', `Hours must be between 0 and ${maxHours.toFixed(1)}`);

		const notesPerHour = input.notesPerHour ?? NOTES_PER_HOUR;
		if (
			!Number.isFinite(notesPerHour) ||
			notesPerHour < MIN_NOTES_PER_HOUR ||
			notesPerHour > MAX_NOTES_PER_HOUR
		)
			return fail(
				400,
				'VALIDATION_ERROR',
				`Notes per hour must be between ${MIN_NOTES_PER_HOUR} and ${MAX_NOTES_PER_HOUR}.`,
			);

		const userComment = input.feedbackMessage ?? '';
		const internalComment = input.justification ?? '';

		// A reviewer approval is a *suggestion* to HQ, not a review event. It does
		// not appear on the timeline; HQ later authorizes it (which materializes the
		// real reviewer + HQ approvals) or discards it.
		await Promise.all([
			db.update(ships).set({ status: 'REVIEWER_APPROVED' }).where(eq(ships.id, shipId)),
			db.insert(shipSuggestions).values({
				shipId,
				reviewerId: reviewerUserId,
				userComment,
				internalComment,
				adjustedHours: hoursAssigned,
				notesPerHour,
			}),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reviewer_approve',
				data: {
					adjustedHours: hoursAssigned,
					notesPerHour,
					notesPayout: Math.ceil(hoursAssigned * notesPerHour),
					userComment,
					internalComment,
					source,
				},
			}),
		]);

		return {
			ok: true,
			data: {
				event: {
					type: 'approval',
					shipId: String(shipId),
					actorId: input.actorId,
					hoursAssigned,
					feedbackMessage: userComment,
					justification: internalComment,
					timestamp: new Date().toISOString(),
				},
			},
		};
	}

	if (input.action === 'reject') {
		if (shipInfo.ship.status !== 'PENDING')
			return fail(400, 'VALIDATION_ERROR', 'Ship is not pending review.');

		const userComment = input.feedbackMessage ?? '';
		const internalComment = input.internalMessage ?? '';

		const slackResult = await sendReviewDM(
			shipInfo.user.slackId,
			shipInfo.project.title,
			shipInfo.project.id,
			'rejected',
			userComment,
		);

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'REJECTED', feedback: userComment })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: reviewerUserId,
				type: 'REJECTION',
				userComment,
				internalComment,
				slackMessageTs: slackResult.ts ?? null,
				slackChannelId: slackResult.channel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reject',
				data: { userComment, internalComment, source },
			}),
		]);

		return {
			ok: true,
			data: {
				event: {
					type: 'rejection',
					shipId: String(shipId),
					actorId: input.actorId,
					feedbackMessage: userComment,
					timestamp: new Date().toISOString(),
				},
			},
		};
	}

	if (input.action === 'comment' || input.action === 'internal_comment') {
		const isInternal = input.action === 'internal_comment';
		const comment = input.commentText ?? '';

		let slackTs: string | undefined;
		let slackChannel: string | undefined;

		if (!isInternal) {
			const slackResult = await sendReviewDM(
				shipInfo.user.slackId,
				shipInfo.project.title,
				shipInfo.project.id,
				'comment',
				comment,
			);
			slackTs = slackResult.ts;
			slackChannel = slackResult.channel;
		}

		await Promise.all([
			db.insert(shipReviews).values({
				shipId,
				reviewerId: reviewerUserId,
				type: 'COMMENT',
				userComment: isInternal ? null : comment,
				internalComment: isInternal ? comment : null,
				isInternal,
				slackMessageTs: slackTs ?? null,
				slackChannelId: slackChannel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'comment',
				data: { comment, isInternal, source },
			}),
		]);

		return {
			ok: true,
			data: {
				event: {
					type: 'comment',
					actorId: input.actorId,
					message: comment,
					isInternal,
					timestamp: new Date().toISOString(),
				},
			},
		};
	}

	if (input.action === 'authorize') {
		if (shipInfo.ship.status !== 'REVIEWER_APPROVED')
			return fail(400, 'VALIDATION_ERROR', 'Ship is not pending HQ review.');

		const [suggestionRow] = await db
			.select({
				suggestion: shipSuggestions,
				reviewer: { id: users.id, username: users.username },
			})
			.from(shipSuggestions)
			.innerJoin(users, eq(shipSuggestions.reviewerId, users.id))
			.where(eq(shipSuggestions.shipId, shipId))
			.orderBy(desc(shipSuggestions.createdAt))
			.limit(1);

		if (!suggestionRow) return fail(404, 'NOT_FOUND', 'No pending suggestion found for this ship.');

		const suggestion = suggestionRow.suggestion;
		const adjustedHours =
			input.hoursAssigned ?? suggestion.adjustedHours ?? shipInfo.ship.seconds / 3600;
		const notesPerHour = suggestion.notesPerHour ?? NOTES_PER_HOUR;
		const notesPayout = Math.ceil(adjustedHours * notesPerHour);
		const userComment = suggestion.userComment ?? '';
		const internalComment = suggestion.internalComment ?? '';

		const [hqReviewer] = await db
			.select({ username: users.username })
			.from(users)
			.where(eq(users.id, reviewerUserId));

		const { oldBalance, newBalance, hqReviewId } = await db.transaction(async (tx) => {
			await tx
				.update(ships)
				.set({ status: 'APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId));

			// Materialize the reviewer's suggestion into a real APPROVAL review,
			// attributed to the original reviewer and timestamped when they reviewed,
			// then drop the suggestion now that HQ has acted on it.
			await tx.insert(shipReviews).values({
				shipId,
				reviewerId: suggestion.reviewerId,
				type: 'APPROVAL',
				userComment,
				internalComment,
				adjustedHours: suggestion.adjustedHours,
				notesPerHour: suggestion.notesPerHour,
				createdAt: suggestion.createdAt,
				updatedAt: suggestion.updatedAt,
			});

			await tx.delete(shipSuggestions).where(eq(shipSuggestions.id, suggestion.id));

			const [hqReview] = await tx
				.insert(shipReviews)
				.values({
					shipId,
					reviewerId: reviewerUserId,
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

			await tx.insert(notesLedger).values({
				userId: shipInfo.user.id,
				delta: notesPayout,
				reason: 'ship_approved',
				refId: shipId,
			});

			await recordAuditLog(tx, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'hq_approve',
				data: { adjustedHours, notesPerHour, notesPayout, source },
			});

			return {
				oldBalance: updatedUser.notesBalance - notesPayout,
				newBalance: updatedUser.notesBalance,
				hqReviewId: hqReview.id,
			};
		});

		const dmResult = await sendReviewDM(
			shipInfo.user.slackId,
			shipInfo.project.title,
			shipInfo.project.id,
			'approved',
			userComment,
		);

		if (dmResult.ts && dmResult.channel) {
			await db
				.update(shipReviews)
				.set({ slackMessageTs: dmResult.ts, slackChannelId: dmResult.channel })
				.where(eq(shipReviews.id, hqReviewId));
		}

		const totalShipTime = formatHours(shipInfo.ship.seconds);
		const adjustedTime = `${Math.floor(adjustedHours)}h ${Math.round((adjustedHours % 1) * 60)}m`;
		const shipDate = shipInfo.ship.submittedAt.toISOString().slice(0, 10);
		const reviewDate = new Date().toISOString().slice(0, 10);
		const hackatimeProjectsList = shipInfo.project.hackatimeProjects.join(', ') || 'None';
		const reviewerName = suggestionRow.reviewer.username ?? 'Unknown';
		const hqReviewerName = hqReviewer?.username ?? 'Unknown';

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
			sendUpdatedBalance(shipInfo.user.slackId, oldBalance, newBalance),
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

		return {
			ok: true,
			data: {
				event: {
					type: 'approval',
					shipId: String(shipId),
					actorId: input.actorId,
					hoursAssigned: adjustedHours,
					feedbackMessage: userComment,
					justification: internalComment,
					timestamp: new Date().toISOString(),
				},
			},
		};
	}

	if (input.action === 'deauthorize') {
		if (shipInfo.ship.status !== 'REVIEWER_APPROVED')
			return fail(400, 'VALIDATION_ERROR', 'Ship is not pending HQ review.');

		// Discarding a suggestion simply drops it and returns the ship to the review
		// queue. It is NOT a rejection of the ship, so no review/timeline event is
		// created — the suggestion never was a review.
		await Promise.all([
			db.update(ships).set({ status: 'PENDING', feedback: null }).where(eq(ships.id, shipId)),
			db.delete(shipSuggestions).where(eq(shipSuggestions.shipId, shipId)),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'discard_suggestion',
				data: { source },
			}),
		]);

		return { ok: true, data: {} };
	}

	if (input.action === 'reverse_authorize') {
		if (shipInfo.ship.status !== 'APPROVED')
			return fail(400, 'VALIDATION_ERROR', 'Ship is not approved.');

		const [hqApproval] = await db
			.select()
			.from(shipReviews)
			.where(and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'HQ_APPROVAL')))
			.orderBy(desc(shipReviews.createdAt))
			.limit(1);

		if (!hqApproval) return fail(404, 'NOT_FOUND', 'No HQ approval review found for this ship.');

		const adjustedHours = hqApproval.adjustedHours ?? 0;
		const notesPerHour = hqApproval.notesPerHour ?? NOTES_PER_HOUR;
		const notesPayout = Math.ceil(adjustedHours * notesPerHour);

		// Reverting to the pending-HQ state means the ship should once again carry a
		// live suggestion rather than a materialized reviewer approval. Pull the
		// reviewer's APPROVAL back out into a suggestion (falling back to the HQ
		// approval's own data for legacy ships that never had a separate APPROVAL).
		const [reviewerApproval] = await db
			.select()
			.from(shipReviews)
			.where(and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'APPROVAL')))
			.orderBy(desc(shipReviews.createdAt))
			.limit(1);

		const { newBalance } = await db.transaction(async (tx) => {
			await tx.update(ships).set({ status: 'REVIEWER_APPROVED' }).where(eq(ships.id, shipId));

			await tx.delete(shipReviews).where(eq(shipReviews.id, hqApproval.id));

			const restored = reviewerApproval ?? hqApproval;
			await tx.insert(shipSuggestions).values({
				shipId,
				reviewerId: restored.reviewerId,
				userComment: restored.userComment,
				internalComment: restored.internalComment,
				adjustedHours: restored.adjustedHours,
				notesPerHour: restored.notesPerHour,
				...(reviewerApproval
					? { createdAt: reviewerApproval.createdAt, updatedAt: reviewerApproval.updatedAt }
					: {}),
			});

			if (reviewerApproval) {
				await tx.delete(shipReviews).where(eq(shipReviews.id, reviewerApproval.id));
			}

			await tx
				.update(projects)
				.set({ committedSeconds: sql`${projects.committedSeconds} - ${shipInfo.ship.seconds}` })
				.where(eq(projects.id, shipInfo.project.id));

			const [updatedUser] = await tx
				.update(users)
				.set({ notesBalance: sql`${users.notesBalance} - ${notesPayout}` })
				.where(eq(users.id, shipInfo.user.id))
				.returning({ notesBalance: users.notesBalance });

			await tx
				.delete(notesLedger)
				.where(
					and(
						eq(notesLedger.userId, shipInfo.user.id),
						eq(notesLedger.reason, 'ship_approved'),
						eq(notesLedger.refId, shipId),
					),
				);

			await recordAuditLog(tx, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reverse_hq_approve',
				data: { adjustedHours, notesPayout, source },
			});

			return { newBalance: updatedUser.notesBalance };
		});

		if (hqApproval.slackMessageTs && hqApproval.slackChannelId) {
			await deleteMessage(hqApproval.slackChannelId, hqApproval.slackMessageTs);
		} else {
			const projectLink = `projects/${shipInfo.project.id}|${shipInfo.project.title}`;
			await findAndDeleteMessages(shipInfo.user.slackId, [
				(text) => text.includes(projectLink) && text.includes('has been approved'),
				(text) => text.includes(`recieved *${notesPayout}* notes`),
			]);
		}

		await sendMessage(
			shipInfo.user.slackId,
			`*${notesPayout}* notes have been deducted from your balance due to a review reversal.\nYour new balance is *${newBalance}* notes.`,
		);

		return { ok: true, data: { reversedNotes: notesPayout } };
	}

	return fail(400, 'VALIDATION_ERROR', `Unknown review action: ${input.action}`);
}

export type UpdateReviewInput = {
	shipId: number;
	reviewerUserId: number;
	type: string;
	feedbackMessage?: string;
	justification?: string;
	internalMessage?: string;
	hoursAssigned?: number;
	source?: string;
};

/**
 * Edits an existing reviewer approval/rejection, re-syncing the Slack DM when
 * the user-facing feedback message changes.
 */
export async function performUpdateReview(
	input: UpdateReviewInput,
): Promise<ReviewResult<Record<string, never>>> {
	const shipId = input.shipId;
	const reviewerUserId = input.reviewerUserId;
	const source = input.source ?? 'sidekick';

	const reviewType = input.type === 'approval' ? 'APPROVAL' : 'REJECTION';

	const [review] = await db
		.select()
		.from(shipReviews)
		.where(
			and(
				eq(shipReviews.shipId, shipId),
				eq(shipReviews.reviewerId, reviewerUserId),
				eq(shipReviews.type, reviewType),
			),
		)
		.orderBy(desc(shipReviews.createdAt))
		.limit(1);

	// While a ship is pending HQ, the reviewer's "approval" is still a suggestion
	// (not yet a review), so an approval edit targets the suggestion instead.
	if (!review && reviewType === 'APPROVAL') {
		const [suggestion] = await db
			.select()
			.from(shipSuggestions)
			.where(
				and(eq(shipSuggestions.shipId, shipId), eq(shipSuggestions.reviewerId, reviewerUserId)),
			)
			.orderBy(desc(shipSuggestions.createdAt))
			.limit(1);

		if (!suggestion) return fail(404, 'NOT_FOUND', 'Review not found.');

		const suggestionUpdates: Partial<typeof shipSuggestions.$inferInsert> = {
			updatedAt: new Date(),
		};
		if (input.feedbackMessage !== undefined) suggestionUpdates.userComment = input.feedbackMessage;
		if (input.justification !== undefined) suggestionUpdates.internalComment = input.justification;
		if (input.hoursAssigned !== undefined) suggestionUpdates.adjustedHours = input.hoursAssigned;

		await db
			.update(shipSuggestions)
			.set(suggestionUpdates)
			.where(eq(shipSuggestions.id, suggestion.id));

		await recordAuditLog(db, {
			actorUserId: reviewerUserId,
			category: 'SHIP_REVIEW',
			entityType: 'review',
			entityId: suggestion.id,
			changeType: 'edit_suggestion',
			data: {
				feedbackMessage: input.feedbackMessage,
				justification: input.justification,
				source,
			},
		});

		return { ok: true, data: {} };
	}

	if (!review) return fail(404, 'NOT_FOUND', 'Review not found.');

	const updates: Partial<typeof shipReviews.$inferInsert> = { updatedAt: new Date() };
	if (input.feedbackMessage !== undefined) updates.userComment = input.feedbackMessage;
	if (input.justification !== undefined) updates.internalComment = input.justification;
	if (input.internalMessage !== undefined) updates.internalComment = input.internalMessage;
	if (input.hoursAssigned !== undefined) updates.adjustedHours = input.hoursAssigned;

	await db.update(shipReviews).set(updates).where(eq(shipReviews.id, review.id));

	if (review.slackMessageTs && review.slackChannelId && input.feedbackMessage) {
		const { editReviewDM } = await import('$lib/server/slack/review_message');
		const [shipInfo] = await db
			.select({ project: projects })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.where(eq(ships.id, shipId));

		if (shipInfo) {
			const dmType = reviewType === 'APPROVAL' ? 'approved' : 'rejected';
			await editReviewDM(
				review.slackChannelId,
				review.slackMessageTs,
				shipInfo.project.title,
				shipInfo.project.id,
				dmType,
				input.feedbackMessage,
			);
		}
	}

	await recordAuditLog(db, {
		actorUserId: reviewerUserId,
		category: 'SHIP_REVIEW',
		entityType: 'review',
		entityId: review.id,
		changeType: 'edit_review',
		data: {
			feedbackMessage: input.feedbackMessage,
			justification: input.justification,
			internalMessage: input.internalMessage,
			source,
		},
	});

	return { ok: true, data: {} };
}
