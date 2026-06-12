import { db } from '$lib/server/db';
import { projects, ships, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function csvField(value: string | number | null | undefined): string {
	if (value == null) return '';
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
	return fields.map(csvField).join(',');
}

export const GET: RequestHandler = async () => {
	const allProjects = await db
		.select({ project: projects, user: users })
		.from(projects)
		.innerJoin(users, eq(projects.userId, users.id))
		.orderBy(users.id, projects.id);

	const allShips = await db.select().from(ships);

	const shipsByProject = new Map<number, typeof allShips>();
	for (const ship of allShips) {
		const arr = shipsByProject.get(ship.projectId) ?? [];
		arr.push(ship);
		shipsByProject.set(ship.projectId, arr);
	}

	const lastShippedByUser = new Map<number, Date>();
	for (const ship of allShips) {
		if (ship.status !== 'APPROVED') continue;
		const proj = allProjects.find((p) => p.project.id === ship.projectId);
		if (!proj) continue;
		const userId = proj.user.id;
		const existing = lastShippedByUser.get(userId);
		if (!existing || ship.submittedAt > existing) {
			lastShippedByUser.set(userId, ship.submittedAt);
		}
	}

	const header =
		'user_id,username,email,slack_id,project_id,project_to_ship,project_description,repo_link,demo_link,project_hours,last_shipped_at';

	const rows: string[] = [header];

	for (const { project, user } of allProjects) {
		const projectShips = shipsByProject.get(project.id) ?? [];
		const hasApproved = projectShips.some((s) => s.status === 'APPROVED');
		if (hasApproved) continue;

		const hours =
			project.hackatimeSeconds != null
				? parseFloat((project.hackatimeSeconds / 3600).toFixed(1))
				: null;

		const lastShipped = lastShippedByUser.get(user.id) ?? null;

		rows.push(
			csvRow([
				user.id,
				user.username,
				user.email,
				user.slackId,
				project.id,
				project.title,
				project.description,
				project.githubUrl,
				project.demoUrl,
				hours,
				lastShipped?.toISOString() ?? null,
			]),
		);
	}

	const csv = rows.join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': 'attachment; filename="not-shipped.csv"',
		},
	});
};
