import { json, text } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authenticateMcpToken } from '$lib/server/mcp/tokens';
import { handleMcpPayload } from '$lib/server/mcp/server';

const PROTOCOL_VERSION = '2025-06-18';

function bearer(request: Request): string | null {
	const header = request.headers.get('Authorization') ?? request.headers.get('authorization');
	if (!header) return null;
	const match = header.match(/^Bearer\s+(.+)$/i);
	return match ? match[1].trim() : null;
}

function unauthorized() {
	return json(
		{
			jsonrpc: '2.0',
			id: null,
			error: { code: -32001, message: 'Invalid or missing MCP token.' },
		},
		{
			status: 401,
			headers: { 'WWW-Authenticate': 'Bearer realm="remixed-admin-mcp"' },
		},
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const auth = await authenticateMcpToken(bearer(request));
	if (!auth) return unauthorized();

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json(
			{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error.' } },
			{ status: 400 },
		);
	}

	const response = await handleMcpPayload(payload, { actor: auth.user });

	// Every message was a notification/response → 202 with no body, per spec.
	if (response === null) return new Response(null, { status: 202 });

	return json(response, { headers: { 'MCP-Protocol-Version': PROTOCOL_VERSION } });
};

// The streamable-HTTP client may open a GET stream or send DELETE to end a
// session. This server is stateless, so we decline both (the SDK handles 405).
export const GET: RequestHandler = async () =>
	text('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });

export const DELETE: RequestHandler = async () => new Response(null, { status: 405 });
