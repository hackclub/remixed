/**
 * One-off backfill: remove phantom approval rows left behind by the old
 * `undoReview` admin action, which reverted ships to PENDING without deleting
 * their materialized APPROVAL / HQ_APPROVAL reviews. Those orphans resurface in
 * Sidekick as duplicate / phantom "pending community approval" pills.
 *
 * A materialized APPROVAL / HQ_APPROVAL review is only valid for a ship that is
 * currently APPROVED. Any such review on a non-APPROVED ship is an orphan and is
 * deleted here.
 *
 * Dry-run by default (prints what it would do). Pass --apply to execute.
 *
 *   POSTGRES_DATABASE_URL=... node scripts/backfill-orphan-approvals.mjs
 *   POSTGRES_DATABASE_URL=... node scripts/backfill-orphan-approvals.mjs --apply
 */
import postgres from 'postgres';

const connectionString = process.env.POSTGRES_DATABASE_URL;
if (!connectionString) {
	throw new Error('POSTGRES_DATABASE_URL is required');
}

const apply = process.argv.includes('--apply');
const sql = postgres(connectionString, { max: 1 });

try {
	const orphans = await sql`
		SELECT sr.id, sr.ship_id, sr.type, s.status
		FROM ship_reviews sr
		JOIN ships s ON s.id = sr.ship_id
		WHERE sr.type IN ('APPROVAL', 'HQ_APPROVAL') AND s.status <> 'APPROVED'
		ORDER BY sr.ship_id, sr.id
	`;

	console.log(`Found ${orphans.length} orphan verdict review(s) on non-APPROVED ships:`);
	const byShip = new Map();
	for (const o of orphans) {
		byShip.set(o.ship_id, (byShip.get(o.ship_id) ?? 0) + 1);
	}
	for (const [shipId, n] of byShip) {
		console.log(`  ship ${shipId}: ${n} orphan review(s)`);
	}

	// Report (but do not touch) live suggestions on ships that are not
	// REVIEWER_APPROVED — these would be unexpected and worth a human look.
	const orphanSuggestions = await sql`
		SELECT ss.id, ss.ship_id, s.status
		FROM ship_suggestions ss
		JOIN ships s ON s.id = ss.ship_id
		WHERE ss.discarded_at IS NULL AND s.status <> 'REVIEWER_APPROVED'
		ORDER BY ss.ship_id
	`;
	if (orphanSuggestions.length > 0) {
		console.log(
			`\nWARNING: ${orphanSuggestions.length} live (non-discarded) suggestion(s) on non-REVIEWER_APPROVED ships — review manually:`,
		);
		for (const s of orphanSuggestions) {
			console.log(`  suggestion ${s.id} on ship ${s.ship_id} (ship status: ${s.status})`);
		}
	}

	if (!apply) {
		console.log('\nDry run — no changes made. Re-run with --apply to delete the orphan reviews.');
	} else if (orphans.length === 0) {
		console.log('\nNothing to delete.');
	} else {
		const deleted = await sql`
			DELETE FROM ship_reviews sr
			USING ships s
			WHERE sr.ship_id = s.id
				AND sr.type IN ('APPROVAL', 'HQ_APPROVAL')
				AND s.status <> 'APPROVED'
			RETURNING sr.id
		`;
		console.log(`\nDeleted ${deleted.length} orphan verdict review(s).`);
	}
} finally {
	await sql.end();
}
