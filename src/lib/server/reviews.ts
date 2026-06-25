import { db } from '$lib/server/db';
import { projects, ships, shipReviews, users, notesLedger } from '$lib/server/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { decrypt } from '$lib/server/crypto';
import { recordAuditLog } from '$lib/server/audit';
import { NOTES_PER_HOUR, formatHours } from '$lib';
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

		const userComment = input.feedbackMessage ?? '';
		const internalComment = input.justification ?? '';

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'REVIEWER_APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: reviewerUserId,
				type: 'APPROVAL',
				userComment,
				internalComment,
				adjustedHours: hoursAssigned,
				notesPerHour: NOTES_PER_HOUR,
			}),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reviewer_approve',
				data: {
					adjustedHours: hoursAssigned,
					notesPerHour: NOTES_PER_HOUR,
					notesPayout: Math.ceil(hoursAssigned * NOTES_PER_HOUR),
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

		const [priorApprovalRow] = await db
			.select({
				review: shipReviews,
				reviewer: { username: users.username },
			})
			.from(shipReviews)
			.innerJoin(users, eq(shipReviews.reviewerId, users.id))
			.where(and(eq(shipReviews.shipId, shipId), eq(shipReviews.type, 'APPROVAL')))
			.orderBy(desc(shipReviews.createdAt))
			.limit(1);

		const priorApproval = priorApprovalRow?.review;
		const adjustedHours =
			input.hoursAssigned ?? priorApproval?.adjustedHours ?? shipInfo.ship.seconds / 3600;
		const notesPerHour = priorApproval?.notesPerHour ?? NOTES_PER_HOUR;
		const notesPayout = Math.ceil(adjustedHours * notesPerHour);
		const userComment = priorApproval?.userComment ?? '';
		const internalComment = priorApproval?.internalComment ?? '';

		const [hqReviewer] = await db
			.select({ username: users.username })
			.from(users)
			.where(eq(users.id, reviewerUserId));

		const { oldBalance, newBalance, hqReviewId } = await db.transaction(async (tx) => {
			await tx
				.update(ships)
				.set({ status: 'APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId));

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
		const reviewerName = priorApprovalRow?.reviewer.username ?? 'Unknown';
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

		await Promise.all([
			db.update(ships).set({ status: 'PENDING', feedback: null }).where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: reviewerUserId,
				type: 'HQ_REJECTION',
				internalComment: null,
				isInternal: true,
			}),
			recordAuditLog(db, {
				actorUserId: reviewerUserId,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'hq_reject',
				data: { source },
			}),
		]);

		return {
			ok: true,
			data: {
				event: {
					type: 'rejection',
					shipId: String(shipId),
					actorId: input.actorId,
					feedbackMessage: '',
					timestamp: new Date().toISOString(),
				},
			},
		};
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

		const { newBalance } = await db.transaction(async (tx) => {
			await tx.update(ships).set({ status: 'REVIEWER_APPROVED' }).where(eq(ships.id, shipId));

			await tx.delete(shipReviews).where(eq(shipReviews.id, hqApproval.id));

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
