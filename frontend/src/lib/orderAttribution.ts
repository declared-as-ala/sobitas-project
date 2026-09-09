import type { NextRequest } from 'next/server';
import { AFFILIATE_COOKIE, isValidAffiliateSubdomain } from '@/util/affiliateHost';

/**
 * Stamp an outgoing order payload with the affiliate attribution held in the request's cookies.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────────────────────
 * The value comes from the REQUEST, never from the body. Both order paths build their payload in
 * the browser — `CheckoutPage` calls `buildBackendOrderPayload` client-side and POSTs it, and
 * `/api/quick-order` receives a browser-composed body — so any `affiliate_subdomain` already in
 * the object was typed by whoever is holding the keyboard. It is deleted and replaced.
 *
 * `pt_aff` is HttpOnly, so page script cannot forge it either; only middleware writes it, and only
 * after resolving the hostname against the backend. And even that is not treated as authority: the
 * label travels as a NAME, and `CommandeController` looks it up again server-side before it sets
 * `commandes.affilie_id`. Three layers, none of which is the browser.
 *
 * Called by both proxies so the two order paths cannot drift — a fix applied to one and not the
 * other is how quick-order and checkout have diverged before.
 */
export function withAffiliateAttribution<T extends object>(payload: T, request: NextRequest): T {
  const next = { ...(payload as unknown as Record<string, unknown>) };
  delete next.affiliate_subdomain;

  const cookie = request.cookies.get(AFFILIATE_COOKIE)?.value;
  // Re-validated on read. A cookie is user-editable, so trusting the value because "we validated
  // it when we set it" trusts the wrong party — the same argument util/referral.ts makes for
  // `pt_ref`, and it applies with more force here because this one ends up on a money row.
  if (isValidAffiliateSubdomain(cookie)) {
    next.affiliate_subdomain = cookie;
  }

  return next as unknown as T;
}
