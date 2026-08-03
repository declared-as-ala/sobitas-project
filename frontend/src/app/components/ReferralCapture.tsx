'use client';

import { useEffect } from 'react';
import { captureReferralFromUrl } from '@/util/referral';

/**
 * Captures `?ref=CODE` into a first-party cookie and cleans it out of the URL.
 *
 * Renders nothing and holds no state, so it never re-renders anything around it. It has to be a
 * CLIENT component mounted in the root layout rather than middleware or a server component,
 * because protein.tn's HTML is edge-cached — on a cache HIT the origin is never reached, so any
 * server-side capture would silently attribute nothing for most visitors. The reasoning is in
 * util/referral.ts; this file is only the mount point.
 *
 * Deliberately NOT wrapped in Suspense and NOT reading `useSearchParams`: that hook opts the whole
 * route out of static rendering, which on this site would cost far more than the feature is worth.
 * Reading `window.location` in an effect is equivalent here and costs nothing — the effect runs
 * after hydration, which is well before anyone can reach checkout.
 */
export function ReferralCapture() {
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  return null;
}
