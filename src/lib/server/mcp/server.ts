import { TOOLS, TOOLS_BY_NAME, ToolError, type ToolContext } from './tools';

/**
 * Minimal, dependency-free implementation of the Model Context Protocol over a
 * single Streamable-HTTP endpoint. Stateless: every POST is handled on its own,
 * responses are plain JSON (no SSE), which the MCP client SDK accepts.
 */

const SERVER_NAME = 'remixed-admin';
const SERVER_VERSION = '1.0.0';
const SUPPORTED_PROTOCOL = '2025-06-18';

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
	jsonrpc: '2.0';
	id?: JsonRpcId;
	method: string;
	params?: Record<string, unknown>;
};

const JSON_RPC = {
	parseError: -32700,
	invalidRequest: -32600,
	methodNotFound: -32601,
	invalidParams: -32602,
	internalError: -32603,
};

function result(id: JsonRpcId, data: unknown) {
	return { jsonrpc: '2.0' as const, id, result: data };
}

function error(id: JsonRpcId, code: number, message: string) {
	return { jsonrpc: '2.0' as const, id, error: { code, message } };
}

function isRequest(value: unknown): value is JsonRpcRequest {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as JsonRpcRequest).jsonrpc === '2.0' &&
		typeof (value as JsonRpcRequest).method === 'string'
	);
}

async function handleSingle(
	message: unknown,
	ctx: ToolContext,
): Promise<object | null> {
	if (!isRequest(message)) {
		return error(null, JSON_RPC.invalidRequest, 'Invalid JSON-RPC request.');
	}

	const { id, method, params } = message;
	// Notifications (no id) get no response body.
	const isNotification = id === undefined;

	switch (method) {
		case 'initialize': {
			const requested = (params?.protocolVersion as string) || SUPPORTED_PROTOCOL;
			return result(id ?? null, {
				protocolVersion: requested,
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
				instructions:
					'Admin tools for the Remixed program. Reads (users, projects, ships, reviews, orders, shop, audit logs) and writes (edit users/projects/shop/orders, adjust balances, drive ship reviews) all act as the admin account that owns this token, and writes are audit-logged.',
			});
		}

		case 'notifications/initialized':
		case 'notifications/cancelled':
			return null;

		case 'ping':
			return result(id ?? null, {});

		case 'tools/list':
			return result(id ?? null, {
				tools: TOOLS.map((t) => ({
					name: t.name,
					description: t.description,
					inputSchema: t.inputSchema,
					annotations: {
						readOnlyHint: !t.mutates,
						destructiveHint: Boolean(t.mutates),
					},
				})),
			});

		case 'tools/call': {
			if (isNotification) return null;
			const name = params?.name as string | undefined;
			const args = (params?.arguments as Record<string, unknown> | undefined) ?? {};
			const tool = name ? TOOLS_BY_NAME.get(name) : undefined;
			if (!tool) {
				return error(id ?? null, JSON_RPC.invalidParams, `Unknown tool: ${name}`);
			}
			try {
				const data = await tool.handler(args, ctx);
				return result(id ?? null, {
					content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
					structuredContent: { result: data },
				});
			} catch (err) {
				// Expected, user-facing failures come back as a tool error (not a
				// protocol error) so the model can read and react to them.
				const message =
					err instanceof ToolError
						? err.message
						: `Internal error running "${name}".`;
				if (!(err instanceof ToolError)) {
					console.error(`[mcp] tool "${name}" failed:`, err);
				}
				return result(id ?? null, {
					content: [{ type: 'text', text: message }],
					isError: true,
				});
			}
		}

		default:
			if (isNotification) return null;
			return error(id ?? null, JSON_RPC.methodNotFound, `Method not found: ${method}`);
	}
}

/**
 * Handle one decoded JSON-RPC payload (object or batch array). Returns the
 * response payload, or null when every message was a notification (HTTP 202).
 */
export async function handleMcpPayload(
	payload: unknown,
	ctx: ToolContext,
): Promise<object | object[] | null> {
	if (Array.isArray(payload)) {
		const responses = (
			await Promise.all(payload.map((message) => handleSingle(message, ctx)))
		).filter((r): r is object => r !== null);
		return responses.length ? responses : null;
	}
	return handleSingle(payload, ctx);
}

export const MCP_SERVER_INFO = { name: SERVER_NAME, version: SERVER_VERSION };
