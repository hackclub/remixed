import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import { signSession } from './crypto';

const DEFAULT_HCA_BASE_URL = 'https://auth.hackclub.com';
const HACKATIME_BASE_URL = 'https://hackatime.hackclub.com';
const HCA_SCOPES = ['openid', 'email', 'name', 'slack_id', 'verification_status'];

type AuthProvider = 'hca' | 'hackatime';

type HcaProfile = {
	id: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	slack_id?: string;
};

type RawHcaProfile = HcaProfile & {
	primary_email?: string;
	identity?: HcaProfile & {
		primary_email?: string;
	};
};

type HackatimeProfile = {
	slack_id?: string;
};

type SlackProfileResponse = {
	ok?: boolean;
	profile?: {
		display_name?: string;
		real_name?: string;
		image_1024?: string;
		image_512?: string;
	};
};

function cookieOptions(url: URL, maxAge?: number) {
	const options = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
	};

	return maxAge == null ? options : { ...options, maxAge };
}

function oauthStateCookie(provider: AuthProvider) {
	return `oauth_state_${provider}`;
}

function getHcaBaseUrl() {
	return env.HCA_BASE_URL?.replace(/\/+$/, '') || DEFAULT_HCA_BASE_URL;
}

function hcaUrl(pathname: string) {
	return new URL(pathname, `${getHcaBaseUrl()}/`).toString();
}

export function issueOauthState(cookies: Cookies, url: URL, provider: AuthProvider) {
	const state = randomBytes(16).toString('hex');
	cookies.set(oauthStateCookie(provider), state, cookieOptions(url, 60 * 10));
	return state;
}

export function consumeOauthState(
	cookies: Cookies,
	url: URL,
	provider: AuthProvider,
	state: string | null,
) {
	const cookieName = oauthStateCookie(provider);
	const expectedState = cookies.get(cookieName);
	cookies.delete(cookieName, cookieOptions(url));
	return Boolean(state && expectedState && state === expectedState);
}

export function clearOauthStateCookies(cookies: Cookies, url: URL) {
	cookies.delete(oauthStateCookie('hca'), cookieOptions(url));
	cookies.delete(oauthStateCookie('hackatime'), cookieOptions(url));
}

export function createSession(cookies: Cookies, url: URL, userId: number) {
	const sessionSignature = signSession(String(userId));
	cookies.set(
		'session_token',
		`${userId}.${sessionSignature}`,
		cookieOptions(url, 60 * 60 * 24 * 180),
	);
}

export function hcaCallbackUrl(url: URL) {
	return new URL('/auth/callback/hca', url).toString();
}

export function hackatimeCallbackUrl(url: URL) {
	return new URL('/auth/callback', url).toString();
}

export function hcaAuthorizeUrl(url: URL, state: string) {
	if (!publicEnv.PUBLIC_HCA_CLIENT_ID) {
		throw new Error('PUBLIC_HCA_CLIENT_ID is required');
	}

	const authorizeUrl = new URL(hcaUrl('/oauth/authorize'));
	authorizeUrl.search = new URLSearchParams({
		client_id: publicEnv.PUBLIC_HCA_CLIENT_ID,
		redirect_uri: hcaCallbackUrl(url),
		response_type: 'code',
		scope: HCA_SCOPES.join(' '),
		state,
	}).toString();

	return authorizeUrl.toString();
}

export function hackatimeAuthorizeUrl(url: URL, state: string) {
	if (!publicEnv.PUBLIC_HACKATIME_OAUTH_UID) {
		throw new Error('PUBLIC_HACKATIME_OAUTH_UID is required');
	}

	return (
		`${HACKATIME_BASE_URL}/oauth/authorize?` +
		new URLSearchParams({
			client_id: publicEnv.PUBLIC_HACKATIME_OAUTH_UID,
			redirect_uri: hackatimeCallbackUrl(url),
			response_type: 'code',
			state,
		}).toString()
	);
}

export async function exchangeHcaCode(code: string, redirectUri: string) {
	if (!publicEnv.PUBLIC_HCA_CLIENT_ID || !env.HCA_CLIENT_SECRET) {
		throw new Error('HCA credentials are not configured');
	}

	const response = await fetch(hcaUrl('/oauth/token'), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: publicEnv.PUBLIC_HCA_CLIENT_ID,
			client_secret: env.HCA_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		}).toString(),
	});

	if (!response.ok) {
		throw new Error(`HCA token exchange failed with ${response.status}`);
	}

	const tokenResponse = await response.json();
	if (!tokenResponse.access_token || typeof tokenResponse.access_token !== 'string') {
		throw new Error('HCA token exchange returned no access token');
	}

	return tokenResponse.access_token;
}

export async function fetchHcaProfile(accessToken: string): Promise<HcaProfile> {
	const response = await fetch(hcaUrl('/api/v1/me'), {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`HCA profile request failed with ${response.status}`);
	}

	const rawProfile = (await response.json()) as RawHcaProfile;
	const profile = rawProfile.identity ?? rawProfile;

	return {
		id: profile.id,
		email: profile.email ?? profile.primary_email,
		first_name: profile.first_name,
		last_name: profile.last_name,
		slack_id: profile.slack_id,
	};
}

export async function exchangeHackatimeCode(code: string, redirectUri: string) {
	if (!publicEnv.PUBLIC_HACKATIME_OAUTH_UID || !env.HACKATIME_OAUTH_SECRET) {
		throw new Error('Hackatime credentials are not configured');
	}

	const response = await fetch(`${HACKATIME_BASE_URL}/oauth/token`, {
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

	if (!response.ok) {
		throw new Error(`Hackatime token exchange failed with ${response.status}`);
	}

	const tokenResponse = await response.json();
	if (!tokenResponse.access_token || typeof tokenResponse.access_token !== 'string') {
		throw new Error('Hackatime token exchange returned no access token');
	}

	return tokenResponse.access_token;
}

export async function fetchHackatimeProfile(accessToken: string): Promise<HackatimeProfile> {
	const response = await fetch(`${HACKATIME_BASE_URL}/api/v1/authenticated/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Hackatime profile request failed with ${response.status}`);
	}

	return response.json();
}

export async function fetchSlackIdentity(
	slackId: string,
	fallbackUsername: string,
	fallbackAvatarUrl: string | null,
) {
	if (!env.SLACK_BOT_USER_OAUTH_TOKEN) {
		return {
			username: fallbackUsername,
			avatarUrl: fallbackAvatarUrl,
		};
	}

	try {
		const response = await fetch('https://slack.com/api/users.profile.get', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				token: env.SLACK_BOT_USER_OAUTH_TOKEN,
				user: slackId,
			}).toString(),
		});

		if (!response.ok) {
			return {
				username: fallbackUsername,
				avatarUrl: fallbackAvatarUrl,
			};
		}

		const slackProfile = (await response.json()) as SlackProfileResponse;
		if (slackProfile.ok === false) {
			return {
				username: fallbackUsername,
				avatarUrl: fallbackAvatarUrl,
			};
		}

		const profile = slackProfile.profile ?? {};

		return {
			username: profile.display_name?.trim() || profile.real_name?.trim() || fallbackUsername,
			avatarUrl: profile.image_1024 || profile.image_512 || fallbackAvatarUrl,
		};
	} catch {
		return {
			username: fallbackUsername,
			avatarUrl: fallbackAvatarUrl,
		};
	}
}
