import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { recordAuditLog } from '$lib/server/audit';
import { db } from '$lib/server/db';
import {
	notesLedger,
	projects,
	shipReviews,
	ships,
	users,
} from '$lib/server/db/schema';
import { and, eq, inArray, desc, sql } from 'drizzle-orm';
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

	return {
		ships: pendingHqShips.map((s) => ({
			...s,
			approval: latestApprovalByShip.get(s.ship.id) ?? null,
		})),
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
		const oldBalance = shipInfo.user.notesBalance;
		const newBalance = oldBalance + notesPayout;

		const slackResult = await sendReviewDM(
			shipInfo.user.slackId,
			shipInfo.project.title,
			'approved',
			userComment,
		);

		await Promise.all([
			db
				.update(ships)
				.set({ status: 'APPROVED', feedback: userComment })
				.where(eq(ships.id, shipId)),
			db.insert(shipReviews).values({
				shipId,
				reviewerId: locals.user!.id,
				type: 'HQ_APPROVAL',
				userComment,
				internalComment,
				adjustedHours,
				slackMessageTs: slackResult.ts ?? null,
				slackChannelId: slackResult.channel ?? null,
			}),
			db
				.update(projects)
				.set({
					committedSeconds: sql`${projects.committedSeconds} + ${shipInfo.ship.seconds}`,
				})
				.where(eq(projects.id, shipInfo.project.id)),
			db
				.update(users)
				.set({ notesBalance: newBalance })
				.where(eq(users.id, shipInfo.user.id)),
			db.insert(notesLedger).values({
				userId: shipInfo.user.id,
				delta: notesPayout,
				reason: 'ship_approved',
				refId: shipId,
			}),
			recordAuditLog(db, {
				actorUserId: locals.user!.id,
				category: 'SHIP_REVIEW',
				entityType: 'ship',
				entityId: shipId,
				changeType: 'hq_approve',
				data: { adjustedHours, notesPayout, userComment, internalComment },
			}),
		]);

		await sendUpdatedBalance(shipInfo.user.slackId, oldBalance, newBalance);

		await createAirtableShipRecord({
			codeUrl: shipInfo.project.githubUrl,
			playableUrl: shipInfo.project.demoUrl,
			firstName: shipInfo.user.firstName,
			lastName: shipInfo.user.lastName,
			email: shipInfo.user.email,
			screenshot: shipInfo.project.coverArt,
			description: shipInfo.project.description,
			githubUsername: extractGithubUsername(shipInfo.project.githubUrl),
			addressLine1: null,
			addressLine2: null,
			city: null,
			state: null,
			country: null,
			zipCode: null,
			birthday: null,
			overrideHoursSpent: adjustedHours,
			overrideHoursJustification: internalComment,
		});
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
