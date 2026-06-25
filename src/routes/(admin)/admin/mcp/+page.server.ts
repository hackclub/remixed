import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createMcpToken, listMcpTokens, revokeMcpToken, deleteMcpToken } from '$lib/server/mcp/tokens';

export const load: PageServerLoad = async ({ url }) => {
	const tokens = await listMcpTokens();
	return {
		tokens,
		mcpUrl: new URL('/api/mcp', url.origin).toString(),
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'A token name is required.' });
		if (name.length > 80) return fail(400, { error: 'Token name is too long.' });

		const issued = await createMcpToken(name, locals.user!.id);
		// Returned once — the page surfaces it so the admin can copy it.
		return { created: { id: issued.id, name: issued.name, token: issued.token } };
	},
	revoke: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid token.' });
		const ok = await revokeMcpToken(id);
		if (!ok) return fail(404, { error: 'Token not found or already revoked.' });
		return { revoked: true };
	},
	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Invalid token.' });
		await deleteMcpToken(id);
		return { deleted: true };
	},
};
