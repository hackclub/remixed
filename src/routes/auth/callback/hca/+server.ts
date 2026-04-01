import { redirect, isRedirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import {
	consumeOauthState,
	createSession,
	exchangeHcaCode,
	fetchHcaProfile,
	fetchSlackIdentity,
	hcaCallbackUrl,
} from '$lib/server/auth';
import { encrypt } from '$lib/server/crypto';

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
		throw redirect(303, '/?error=hca_denied');
	}

	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(303, '/?error=hca_failed');
	}

	if (!consumeOauthState(cookies, url, 'hca', url.searchParams.get('state'))) {
		throw redirect(303, '/?error=hca_state');
	}

	try {
		const accessToken = await exchangeHcaCode(code, hcaCallbackUrl(url));
		const hcaProfile = await fetchHcaProfile(accessToken);
		const slackId = hcaProfile.slack_id?.trim();

		if (!hcaProfile.id || !slackId) {
			throw redirect(303, '/?error=hca_missing_slack');
		}

		const existingUser = await db.query.users.findFirst({
			where: or(eq(users.hcaId, hcaProfile.id), eq(users.slackId, slackId)),
		});

		const slackIdentity = await fetchSlackIdentity(
			slackId,
			fallbackUsername(hcaProfile.first_name, hcaProfile.last_name, hcaProfile.email, slackId),
			existingUser?.avatarUrl ?? null,
		);

		let userId = existingUser?.id;
		const alreadyLinkedHackatime = Boolean(existingUser?.accessToken);

		const primaryAddress = hcaProfile.addresses?.find((a) => a.primary) ?? hcaProfile.addresses?.[0];
		const encryptOrKeep = (val: string | undefined | null, existing: string | null | undefined) =>
			val ? encrypt(val) : (existing ?? null);

		if (existingUser) {
			await db
				.update(users)
				.set({
					hcaId: hcaProfile.id,
					slackId,
					username: slackIdentity.username,
					avatarUrl: slackIdentity.avatarUrl,
					email: hcaProfile.email ?? existingUser.email,
					firstName: hcaProfile.first_name ?? existingUser.firstName,
					lastName: hcaProfile.last_name ?? existingUser.lastName,
					birthday: encryptOrKeep(hcaProfile.birthday, existingUser.birthday),
					addressLine1: encryptOrKeep(primaryAddress?.line_1, existingUser.addressLine1),
					addressLine2: encryptOrKeep(primaryAddress?.line_2, existingUser.addressLine2),
					city: encryptOrKeep(primaryAddress?.city, existingUser.city),
					state: encryptOrKeep(primaryAddress?.state, existingUser.state),
					country: encryptOrKeep(primaryAddress?.country, existingUser.country),
					zipCode: encryptOrKeep(primaryAddress?.postal_code, existingUser.zipCode),
				})
				.where(eq(users.id, existingUser.id));
		} else {
			const encryptOrNull = (val: string | undefined | null) => (val ? encrypt(val) : null);

			const [user] = await db
				.insert(users)
				.values({
					hcaId: hcaProfile.id,
					slackId,
					username: slackIdentity.username,
					avatarUrl: slackIdentity.avatarUrl,
					accessToken: null,
					email: hcaProfile.email ?? null,
					firstName: hcaProfile.first_name ?? null,
					lastName: hcaProfile.last_name ?? null,
					birthday: encryptOrNull(hcaProfile.birthday),
					addressLine1: encryptOrNull(primaryAddress?.line_1),
					addressLine2: encryptOrNull(primaryAddress?.line_2),
					city: encryptOrNull(primaryAddress?.city),
					state: encryptOrNull(primaryAddress?.state),
					country: encryptOrNull(primaryAddress?.country),
					zipCode: encryptOrNull(primaryAddress?.postal_code),
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

		console.error('HCA callback failed', error);
		throw redirect(303, '/?error=hca_failed');
	}
};
