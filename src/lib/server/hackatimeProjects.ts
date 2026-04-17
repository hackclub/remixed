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
	const startParams = env.HACKATIME_START_DATE ? { start: env.HACKATIME_START_DATE } : undefined;

	// First pass: get all project names (list endpoint doesn't include total_seconds)
	const { projects: projectList } = await hackatime.getProjects(startParams);
	if (projectList.length === 0) return [];

	// Second pass: get total_seconds for all projects by passing their names as a filter
	const projectNames = projectList.map((p) => p.name).join(',');
	const { projects: projectsWithTime } = await hackatime.getProjects({
		...startParams,
		projects: projectNames,
	});

	const timeMap = new Map(projectsWithTime.map((p) => [p.name, p.total_seconds]));

	return projectList
		.filter((p) => p.name !== '<<LAST_PROJECT>>')
		.map((p) => {
			const claimedBy = userProjects.find((up) => up.hackatimeProjects.includes(p.name));
			return {
				name: p.name,
				totalSeconds: timeMap.get(p.name) ?? 0,
				claimedBy: claimedBy != undefined ? claimedBy.id : null,
			};
		})
		.filter((p) => p.totalSeconds > 0);
}
