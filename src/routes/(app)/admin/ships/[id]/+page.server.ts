import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import { projects, shipReviews, ships, users } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendReviewDM, editReviewDM } from '$lib/server/slack/review_message';
import { NOTES_PER_HOUR } from '$lib';

export const load: PageServerLoad = async ({ params, locals }) => {
	const projectId = Number(params.id);

	const [projectInfo] = await db
		.select({
			project: projects,
			user: {
				id: users.id,
				username: users.username,
				slackId: users.slackId,
				avatarUrl: users.avatarUrl,
			},
		})
		.from(projects)
		.innerJoin(users, eq(projects.userId, users.id))
		.where(eq(projects.id, projectId));

	if (!projectInfo) {
		error(404, 'Project not found');
	}

	const projectShips = await db
		.select()
		.from(ships)
		.where(eq(ships.projectId, projectId))
		.orderBy(ships.submittedAt);

	const shipIds = projectShips.map((s) => s.id);
	const reviews =
		shipIds.length > 0
			? await db
					.select({
						review: shipReviews,
						reviewer: {
							id: users.id,
							username: users.username,
							avatarUrl: users.avatarUrl,
						},
					})
					.from(shipReviews)
					.innerJoin(users, eq(shipReviews.reviewerId, users.id))
					.where(inArray(shipReviews.shipId, shipIds))
					.orderBy(shipReviews.createdAt)
			: [];

	const pendingShip = projectShips.find((s) => s.status === 'PENDING') ?? null;

	return {
		project: projectInfo.project,
		user: projectInfo.user,
		projectShips,
		reviews,
		pendingShip,
		notesPerHour: NOTES_PER_HOUR,
		currentUserId: locals.user!.id,
		currentUserRoles: locals.user!.roles,
	};
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const adjustedHours = Number(data.get('adjustedHours'));
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();

		if (!userComment || !internalComment) {
			return fail(400, { error: 'Both user and internal comments are required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'PENDING') {
			return fail(400, { error: 'Ship not available for approval' });
		}

		const maxHours = shipInfo.ship.seconds / 3600;
		if (adjustedHours <= 0 || adjustedHours > maxHours + 0.01) {
			return fail(400, { error: `Hours must be between 0 and ${maxHours.toFixed(1)}` });
		}

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'REVIEWER_APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'APPROVAL',
				userComment,
				internalComment,
				adjustedHours,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reviewer_approve',
				data: {
					adjustedHours,
					notesPayout: Math.ceil(adjustedHours * NOTES_PER_HOUR),
					userComment,
					internalComment,
				},
			}),
		]);
	},
	reject: async ({ locals, request }) => {
		const data = await request.formData();
		const userComment = (data.get('userComment') as string).trim();
		const internalComment = (data.get('internalComment') as string).trim();
		const shipId = Number(data.get('shipId'));

		if (!userComment || !internalComment) {
			return fail(400, { error: 'Both user and internal comments are required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo || shipInfo.ship.status !== 'PENDING') {
			return fail(400, { error: 'Ship not available for rejection' });
		}

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
				reviewerId: locals.user!.id,
				type: 'REJECTION',
				userComment,
				internalComment,
				slackMessageTs: slackResult.ts ?? null,
				slackChannelId: slackResult.channel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'reject',
				data: { userComment, internalComment },
			}),
		]);
	},
	comment: async ({ request, locals }) => {
		const data = await request.formData();
		const shipId = Number(data.get('shipId'));
		const comment = (data.get('comment') as string).trim();
		const isInternal = data.get('isInternal') === 'on';

		if (!comment) {
			return fail(400, { error: 'Comment is required' });
		}

		const [shipInfo] = await db
			.select({ ship: ships, project: projects, user: users })
			.from(ships)
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(ships.id, shipId));

		if (!shipInfo) {
			return fail(404, { error: 'Ship not found' });
		}

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
				reviewerId: locals.user!.id,
				type: 'COMMENT',
				userComment: isInternal ? null : comment,
				internalComment: isInternal ? comment : null,
				isInternal,
				slackMessageTs: slackTs ?? null,
				slackChannelId: slackChannel ?? null,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'comment',
				data: { comment, isInternal },
			}),
		]);
	},
	editReview: async ({ request, locals }) => {
		const data = await request.formData();
		const reviewId = Number(data.get('reviewId'));
		const userComment = (data.get('userComment') as string | null)?.trim() ?? null;
		const internalComment = (data.get('internalComment') as string | null)?.trim() ?? null;
		const adjustedHoursRaw = data.get('adjustedHours');
		const adjustedHours = adjustedHoursRaw ? Number(adjustedHoursRaw) : undefined;

		const [reviewInfo] = await db
			.select({
				review: shipReviews,
				ship: ships,
				project: projects,
				user: users,
			})
			.from(shipReviews)
			.innerJoin(ships, eq(shipReviews.shipId, ships.id))
			.innerJoin(projects, eq(ships.projectId, projects.id))
			.innerJoin(users, eq(projects.userId, users.id))
			.where(eq(shipReviews.id, reviewId));

		if (!reviewInfo) {
			return fail(404, { error: 'Review not found' });
		}

		if (reviewInfo.review.reviewerId !== locals.user!.id) {
			return fail(403, { error: 'Can only edit your own reviews' });
		}

		if (adjustedHours !== undefined && reviewInfo.review.type === 'HQ_APPROVAL') {
			return fail(400, {
				error:
					'Final approved hours cannot be edited after HQ approval. Undo and re-approve to change payout.',
			});
		}

		if (adjustedHours !== undefined) {
			const maxHours = reviewInfo.ship.seconds / 3600;
			if (!Number.isFinite(adjustedHours) || adjustedHours <= 0 || adjustedHours > maxHours + 0.01) {
				return fail(400, { error: `Hours must be between 0 and ${maxHours.toFixed(1)}` });
			}
		}

		await db
			.update(shipReviews)
			.set({
				...(userComment !== null ? { userComment } : {}),
				...(internalComment !== null ? { internalComment } : {}),
				...(adjustedHours !== undefined ? { adjustedHours } : {}),
				updatedAt: new Date(),
			})
			.where(eq(shipReviews.id, reviewId));

		if (
			reviewInfo.review.slackMessageTs &&
			reviewInfo.review.slackChannelId &&
			userComment
		) {
			const type =
				reviewInfo.review.type === 'APPROVAL' ||
				reviewInfo.review.type === 'HQ_APPROVAL'
					? 'approved'
					: reviewInfo.review.type === 'REJECTION' ||
						  reviewInfo.review.type === 'HQ_REJECTION'
						? 'rejected'
						: 'comment';
			await editReviewDM(
				reviewInfo.review.slackChannelId,
				reviewInfo.review.slackMessageTs,
				reviewInfo.project.title,
				reviewInfo.project.id,
				type,
				userComment,
			);
		}

		await recordAuditLog(db, {
			actorUserId: locals.user!.id,
			category: 'SHIP_REVIEW',
			entityType: 'review',
			entityId: reviewId,
			changeType: 'edit_review',
			data: { userComment, internalComment, adjustedHours },
		});
	},
};
