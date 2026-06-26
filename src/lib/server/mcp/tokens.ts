import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { mcpTokens, users } from '$lib/server/db/schema';

const TOKEN_PREFIX = 'rmx_mcp_';

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export type IssuedToken = {
	id: number;
	name: string;
	/** The full secret. Only ever returned here, at creation time. */
	token: string;
	prefix: string;
};

/**
 * Mints a new MCP token, storing only its SHA-256 hash. The plaintext secret is
 * returned exactly once so the caller can show it to the admin.
 */
export async function createMcpToken(name: string, createdByUserId: number): Promise<IssuedToken> {
	const secret = TOKEN_PREFIX + randomBytes(24).toString('hex');
	const tokenHash = hashToken(secret);
	const tokenPrefix = secret.slice(0, TOKEN_PREFIX.length + 6);

	const [row] = await db
		.insert(mcpTokens)
		.values({ name, tokenHash, tokenPrefix, createdByUserId })
		.returning({ id: mcpTokens.id });

	return { id: row.id, name, token: secret, prefix: tokenPrefix };
}

export type AuthenticatedToken = {
	tokenId: number;
	user: typeof users.$inferSelect;
};

/**
 * Resolves a bearer token to its owning (acting) user, or null when the token
 * is unknown or revoked. Bumps `lastUsedAt` on success.
 */
export async function authenticateMcpToken(
	rawToken: string | null | undefined,
): Promise<AuthenticatedToken | null> {
	if (!rawToken || !rawToken.startsWith(TOKEN_PREFIX)) return null;

	const tokenHash = hashToken(rawToken);

	const [row] = await db
		.select({ token: mcpTokens, user: users })
		.from(mcpTokens)
		.innerJoin(users, eq(mcpTokens.createdByUserId, users.id))
		.where(eq(mcpTokens.tokenHash, tokenHash));

	if (!row || row.token.revokedAt) return null;

	// Constant-time confirmation that the stored hash matches, guarding against
	// any chance of a partial-hash collision in the index lookup.
	const expected = Buffer.from(row.token.tokenHash);
	const actual = Buffer.from(tokenHash);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

	await db
		.update(mcpTokens)
		.set({ lastUsedAt: new Date() })
		.where(eq(mcpTokens.id, row.token.id));

	return { tokenId: row.token.id, user: row.user };
}

export async function listMcpTokens() {
	return db
		.select({
			id: mcpTokens.id,
			name: mcpTokens.name,
			prefix: mcpTokens.tokenPrefix,
			createdAt: mcpTokens.createdAt,
			lastUsedAt: mcpTokens.lastUsedAt,
			revokedAt: mcpTokens.revokedAt,
			createdByUsername: users.username,
		})
		.from(mcpTokens)
		.innerJoin(users, eq(mcpTokens.createdByUserId, users.id))
		.orderBy(desc(mcpTokens.createdAt));
}

export async function revokeMcpToken(id: number): Promise<boolean> {
	const [row] = await db
		.update(mcpTokens)
		.set({ revokedAt: new Date() })
		.where(and(eq(mcpTokens.id, id), isNull(mcpTokens.revokedAt)))
		.returning({ id: mcpTokens.id });
	return Boolean(row);
}

export async function deleteMcpToken(id: number): Promise<void> {
	await db.delete(mcpTokens).where(eq(mcpTokens.id, id));
}
