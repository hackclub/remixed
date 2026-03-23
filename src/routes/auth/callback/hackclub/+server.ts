import { redirect, isRedirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import {
	consumeOauthState,
	createSession,
	exchangeHackClubCode,
	fetchHackClubProfile,
	fetchSlackIdentity,
	hackClubCallbackUrl,
} from '$lib/server/auth';

function fallbackUsername(
	firstName: string | undefined,
	lastName: string | undefined,
	email: string | undefined,
	slackId: string,
) {
	const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
	if (fullName) return fullName;
	if (email) return email.split('@')[0];
	return slackId;
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (url.searchParams.get('error')) {
		throw redirect(303, '/?error=hackclub_denied');
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(303, '/?error=hackclub_failed');
	}

	if (!consumeOauthState(cookies, url, 'hackclub', url.searchParams.get('state'))) {
		throw redirect(303, '/?error=hackclub_state');
	}

	try {
		const accessToken = await exchangeHackClubCode(code, hackClubCallbackUrl(url));
		const hackClubProfile = await fetchHackClubProfile(accessToken);
		const slackId = hackClubProfile.slack_id?.trim();

		if (!hackClubProfile.id || !slackId) {
			throw redirect(303, '/?error=hackclub_missing_slack');
		}

		const existingUser = await db.query.users.findFirst({
			where: or(eq(users.hackClubId, hackClubProfile.id), eq(users.slackId, slackId)),
		});

		const slackIdentity = await fetchSlackIdentity(
			slackId,
			fallbackUsername(
				hackClubProfile.first_name,
				hackClubProfile.last_name,
				hackClubProfile.email,
				slackId,
			),
			existingUser?.avatarUrl ?? null,
		);

		let userId = existingUser?.id;
		const alreadyLinkedHackatime = Boolean(existingUser?.accessToken);

		if (existingUser) {
			await db
				.update(users)
				.set({
					hackClubId: hackClubProfile.id,
					slackId,
					username: slackIdentity.username,
					avatarUrl: slackIdentity.avatarUrl,
				})
				.where(eq(users.id, existingUser.id));
		} else {
			const [user] = await db
				.insert(users)
				.values({
					hackClubId: hackClubProfile.id,
					slackId,
					username: slackIdentity.username,
					avatarUrl: slackIdentity.avatarUrl,
					accessToken: null,
				})
				.returning({ id: users.id });

			userId = user.id;

			const referrerId = Number(cookies.get('ref'));
			if (referrerId && referrerId !== user.id) {
				await db
					.update(users)
					.set({ referrals: sql`${users.referrals} + 1` })
					.where(eq(users.id, referrerId));
			}
		}

		cookies.delete('ref', { path: '/' });
		createSession(cookies, url, userId!);
		throw redirect(303, alreadyLinkedHackatime ? '/projects' : '/auth/hackatime');
	} catch (error) {
		if (isRedirect(error)) {
			throw error;
		}

		console.error('Hack Club Auth callback failed', error);
		throw redirect(303, '/?error=hackclub_failed');
	}
};
