import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/public';
import { env as senv } from '$env/dynamic/private';

export const load: PageServerLoad = async ({url}) => {
  console.log(url.searchParams)
  const tokenReq = await fetch("https://hackatime.hackclub.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.PUBLIC_HACKATIME_OAUTH_UID,
      client_secret: senv.HACKATIME_OAUTH_SECRET,
      code: url.searchParams.get("code") as string,
      redirect_uri: "http://localhost:5173/auth/callback",
      grant_type: "authorization_code"
    }).toString()
  })
  const tokenResp = await tokenReq.json()
  console.log(tokenResp)
	redirect(307, '/');
}
