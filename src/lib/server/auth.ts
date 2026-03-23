import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';
import { signSession } from './crypto';

const HACK_CLUB_AUTH_BASE_URL = 'https://api.hackclub.com';
const HACKATIME_BASE_URL = 'https://hackatime.hackclub.com';
const HACK_CLUB_SCOPES = ['openid', 'email', 'name', 'slack_id', 'verification_status'];

type AuthProvider = 'hackclub' | 'hackatime';

type HackClubProfile = {
	id: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	slack_id?: string;
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
	cookies.delete(oauthStateCookie('hackclub'), cookieOptions(url));
	cookies.delete(oauthStateCookie('hackatime'), cookieOptions(url));
}

export function createSession(cookies: Cookies, url: URL, userId: number) {
	const sessionSignature = signSession(String(userId));
	cookies.set('session_token', `${userId}.${sessionSignature}`, cookieOptions(url, 60 * 60 * 24 * 180));
}

export function hackClubCallbackUrl(url: URL) {
	return new URL('/auth/callback/hackclub', url).toString();
}

export function hackatimeCallbackUrl(url: URL) {
	return new URL('/auth/callback', url).toString();
}

export function hackClubAuthorizeUrl(url: URL, state: string) {
	if (!publicEnv.PUBLIC_HACKCLUB_CLIENT_ID) {
		throw new Error('PUBLIC_HACKCLUB_CLIENT_ID is required');
	}

	return (
		`${HACK_CLUB_AUTH_BASE_URL}/oauth/authorize?` +
		new URLSearchParams({
			client_id: publicEnv.PUBLIC_HACKCLUB_CLIENT_ID,
			redirect_uri: hackClubCallbackUrl(url),
			response_type: 'code',
			scope: HACK_CLUB_SCOPES.join(' '),
			state,
		}).toString()
	);
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

export async function exchangeHackClubCode(code: string, redirectUri: string) {
	if (!publicEnv.PUBLIC_HACKCLUB_CLIENT_ID || !env.HACKCLUB_CLIENT_SECRET) {
		throw new Error('Hack Club Auth credentials are not configured');
	}

	const response = await fetch(`${HACK_CLUB_AUTH_BASE_URL}/oauth/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			client_id: publicEnv.PUBLIC_HACKCLUB_CLIENT_ID,
			client_secret: env.HACKCLUB_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code',
		}).toString(),
	});

	if (!response.ok) {
		throw new Error(`Hack Club token exchange failed with ${response.status}`);
	}

	const tokenResponse = await response.json();
	if (!tokenResponse.access_token || typeof tokenResponse.access_token !== 'string') {
		throw new Error('Hack Club token exchange returned no access token');
	}

	return tokenResponse.access_token;
}

export async function fetchHackClubProfile(accessToken: string): Promise<HackClubProfile> {
	const response = await fetch(`${HACK_CLUB_AUTH_BASE_URL}/api/v1/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error(`Hack Club profile request failed with ${response.status}`);
	}

	return response.json();
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
