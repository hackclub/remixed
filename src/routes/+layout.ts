import posthog from 'posthog-js'
import { browser } from '$app/environment';

export const load = async () => {
  if (browser) {
    posthog.init(
      'phc_OKX9X3nuj6FBajQz5RC7IJJlXloyEmRlfa6KBFdew5g',
      {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-01-30'
      }
    );
  }

  return;
};