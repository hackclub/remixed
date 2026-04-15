import { eq } from 'drizzle-orm';
import { db } from './db';
import { projects } from './db/schema';
import { env } from '$env/dynamic/private';
import { HackatimeClient } from './hackatime';

export async function getProjects(userId: number, accessToken: string) {
	const userProjects = await db
		.select({ hackatimeProjects: projects.hackatimeProjects, id: projects.id })
		.from(projects)
		.where(eq(projects.userId, userId));

	const hackatime = new HackatimeClient(accessToken);
	const { projects: allHackatimeProjects } = await hackatime.getProjects(
		env.HACKATIME_START_DATE ? { start: env.HACKATIME_START_DATE } : undefined,
	);

	return allHackatimeProjects.map((p) => {
		const claimedBy = userProjects.find((up) => up.hackatimeProjects.includes(p.name));
		return {
			name: p.name,
			claimedBy: claimedBy != undefined ? claimedBy.id : null,
		};
	});
}
