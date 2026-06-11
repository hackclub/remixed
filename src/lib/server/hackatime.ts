import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

const BASE_URL = 'https://hackatime.hackclub.com';

export type HackatimeProfile = {
	id?: string;
	slack_id?: string;
};

export type HackatimeProject = {
	name: string;
	total_seconds: number;
};

export type HackatimeProjectsResponse = {
	projects: HackatimeProject[];
};

export class HackatimeClient {
	private accessToken: string;

	constructor(accessToken: string) {
		this.accessToken = accessToken;
	}

	private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${BASE_URL}${path}`);
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				url.searchParams.set(key, value);
			}
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		const text = await response.text();
		try {
			return JSON.parse(text) as T;
		} catch {
			console.error(
				`[Hackatime] Non-JSON response from GET ${url} (${response.status}):\n${text}`,
			);
			throw new Error(`Hackatime returned non-JSON response (${response.status})`);
		}
	}

	async getProfile(): Promise<HackatimeProfile> {
		return this.get<HackatimeProfile>('/api/v1/authenticated/me');
	}

	async getProjects(params?: { start?: string; projects?: string }): Promise<HackatimeProjectsResponse> {
		const query: Record<string, string> = {};
		if (params?.start) query.start = params.start;
		if (params?.projects) query.projects = params.projects;
		return this.get<HackatimeProjectsResponse>('/api/v1/authenticated/projects', query);
	}

	static async lookupSlackId(slackId: string): Promise<string | null> {
		const apiKey = env.HACKATIME_STATS_API_KEY;
		if (!apiKey) return null;

		try {
			const response = await fetch(
				`${BASE_URL}/api/v1/users/lookup_slack_uid/${encodeURIComponent(slackId)}`,
				{ headers: { Authorization: `Bearer ${apiKey}` } },
			);
			if (!response.ok) return null;
			const data = (await response.json()) as { user_id?: number };
			return data.user_id != null ? String(data.user_id) : null;
		} catch {
			return null;
		}
	}

	static async exchangeCode(code: string, redirectUri: string): Promise<string> {
		if (!publicEnv.PUBLIC_HACKATIME_OAUTH_UID || !env.HACKATIME_OAUTH_SECRET) {
			throw new Error('Hackatime credentials are not configured');
		}

		const response = await fetch(`${BASE_URL}/oauth/token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: publicEnv.PUBLIC_HACKATIME_OAUTH_UID,
				client_secret: env.HACKATIME_OAUTH_SECRET,
				code,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}).toString(),
		});

		const text = await response.text();
		if (!response.ok) {
			console.error(`[Hackatime] Token exchange failed (${response.status}):\n${text}`);
			throw new Error(`Hackatime token exchange failed with ${response.status}`);
		}

		let tokenResponse: { access_token?: string };
		try {
			tokenResponse = JSON.parse(text);
		} catch {
			console.error(
				`[Hackatime] Non-JSON response from token exchange (${response.status}):\n${text}`,
			);
			throw new Error('Hackatime token exchange returned non-JSON response');
		}

		if (!tokenResponse.access_token || typeof tokenResponse.access_token !== 'string') {
			throw new Error('Hackatime token exchange returned no access token');
		}

		return tokenResponse.access_token;
	}
}
