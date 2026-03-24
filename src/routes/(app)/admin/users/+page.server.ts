import type { RoleEnumPub } from '$lib';
import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const allUsers = await db.select().from(users).orderBy(users.id);
	return {
		users: allUsers,
	};
};

function normalizeOptionalText(value: FormDataEntryValue | null): string | null {
	const text = String(value ?? '').trim();
	return text ? text : null;
}

export const actions: Actions = {
	updateUser: async ({ request, locals }) => {
		const data = await request.formData();
		const userId = Number(data.get('userId'));
		const username = String(data.get('username') ?? '').trim();
		const slackId = String(data.get('slackId') ?? '').trim();
		const notesBalance = Number(String(data.get('notesBalance') ?? '').trim());
		const referrals = Number(String(data.get('referrals') ?? '').trim());
		const userRoles = data.getAll('userRoles') as ('USER' | 'STAFF' | 'REVIEWER' | 'ORGANIZER')[];
		const hcaId = normalizeOptionalText(data.get('hcaId'));
		const avatarUrl = normalizeOptionalText(data.get('avatarUrl'));

		if (!userId || !username || !slackId || !Number.isInteger(notesBalance) || !Number.isInteger(referrals)) {
			return fail(400, { error: 'Invalid user update' });
		}

		const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
		if (!existingUser) {
			return fail(404, { error: 'User not found' });
		}

		const allUsers = await db.select().from(users);
		const slackConflict = allUsers.find((user) => user.id !== userId && user.slackId === slackId);
		if (slackConflict) {
			return fail(409, { error: 'Slack ID is already in use' });
		}

		if (hcaId) {
			const hcaConflict = allUsers.find((user) => user.id !== userId && user.hcaId === hcaId);
			if (hcaConflict) {
				return fail(409, { error: 'HCA ID is already in use' });
			}
		}

		const roles: RoleEnumPub[] = ['USER', ...new Set(userRoles.filter((role) => role !== 'USER'))];

		await db
			.update(users)
			.set({
				username,
				slackId,
				hcaId,
				avatarUrl,
				notesBalance,
				referrals,
				roles,
			})
			.where(eq(users.id, userId));
		await db
			.insert(auditLogs)
			.values({
				category: 'EDIT_USER',
				userId: locals.user!.id,
				data: { userId, username, slackId, hcaId, avatarUrl, notesBalance, referrals, userRoles: roles },
			});
	},
};
