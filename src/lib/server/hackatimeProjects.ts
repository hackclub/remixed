import { eq } from 'drizzle-orm';
import { db } from './db';
import { projects } from './db/schema';

export async function getProjects(userId: number, accessToken: string) {
	const userProjects = await db
		.select({ hackatimeProjects: projects.hackatimeProjects, id: projects.id })
		.from(projects)
		.where(eq(projects.userId, userId));

	const allHackatimeProjects = await fetch(
		'https://hackatime.hackclub.com/api/v1/authenticated/projects?' +
			new URLSearchParams({ start: '2026-03-07' }),
		{
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	).then((r) => r.json());

	return allHackatimeProjects.projects.map((p: any) => {
		const claimedBy = userProjects.find((up) => up.hackatimeProjects.includes(p.name));
		return {
			name: p.name,
			claimedBy: claimedBy != undefined ? claimedBy.id : null,
		};
	});
}
