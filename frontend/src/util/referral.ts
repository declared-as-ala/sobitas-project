/**
 * Partner attribution — capturing "who sent this customer" from a link.
 *
 * ── THE CONSTRAINT THAT DECIDES THE WHOLE DESIGN ──────────────────────────────────────────
 * protein.tn's HTML is edge-cached by Cloudflare. On a cache HIT the request NEVER REACHES THE
 * NEXT SERVER — so `middleware.ts`, server components, route handlers and any `Set-Cookie` from
 * the origin simply do not run for the majority of visitors. Every server-side attribution scheme
 * fails silently here, and fails in the worst way: it works perfectly in development and on the
 * first uncached request, then quietly attributes nothing in production.
 *
 * Worse, a server-set cookie on a cacheable response is actively dangerous — a `Set-Cookie` that
 * got stored at the edge would hand ONE partner's code to every subsequent visitor of that URL.
 * That is the same class of bug as the `Vary` failures documented in docs/CLOUDFLARE-CACHE-RULES.md.
 *
 * Therefore attribution is CLIENT-SIDE, in full. The browser reads `?ref=` off its own URL and
 * writes a first-party cookie. This is immune to caching by construction, needs no plan features,
 * and cannot leak between visitors.
 *
 * ── LAST TOUCH, AND WHY ───────────────────────────────────────────────────────────────────
 * A newer link overwrites an older one. Two reasons: it matches what the customer would expect
 * (the coach whose link they just followed is the one they are thinking of), and it matches the
 * authoritative record anyway — the real attribution is the code ATTACHED TO THE ORDER, which the
 * customer can see and change at checkout. This cookie only pre-fills that field. It is a
 * convenience, never the source of truth, and no commission is ever computed from it.
 */

export const REFERRAL_COOKIE = 'pt_ref';
export const REFERRAL_PARAM = 'ref';

/** 30 days. Long enough for a considered purchase, short enough not to be a lifetime claim. */
const MAX_AGE_DAYS = 30;

/**
 * Partner codes are `[A-Z0-9_-]`, 3–32 chars. Validated BEFORE anything is stored, because this
 * value is read back out of a cookie and rendered — an unvalidated round trip through
 * `document.cookie` is a reflected-XSS shape. The server validates independently; this is the
 * near-side guard, not the only one.
 */
const CODE_RE = /^[A-Za-z0-9_-]{3,32}$/;

export function isValidReferralCode(value: string | null | undefined): value is string {
  return typeof value === 'string' && CODE_RE.test(value);
}

function writeCookie(code: string): void {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  // `SameSite=Lax` so it survives the top-level navigation a partner link IS, while still not
  // riding along on cross-site subrequests. No `Secure` guard needed — the site is HTTPS-only.
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; Max-Age=${maxAge}; Path=/; SameSite=Lax; Secure`;
}

export function readReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${REFERRAL_COOKIE}=([^;]*)`));
  if (!match) return null;
  let value: string;
  try {
    value = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  // Re-validate on READ as well as on write. A cookie is user-editable, so trusting it because
  // "we validated it when we set it" trusts the wrong party.
  return isValidReferralCode(value) ? value : null;
}

export function clearReferralCode(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${REFERRAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax; Secure`;
}

/**
 * Capture `?ref=CODE` from the current URL, persist it, and strip it from the address bar.
 *
 * Stripping matters for three separate reasons, and each alone would justify it:
 *   1. SEO — `?ref=` URLs are the same page as the canonical one. Left in place they get shared,
 *      linked and indexed as duplicates. (`generateMetadata` already emits a self-canonical, but a
 *      clean URL is better than a canonical tag correcting a mess.)
 *   2. Cloudflare's cache key includes the query string — verified on this site. Every distinct
 *      `?ref=` is a SEPARATE cache entry for identical HTML, so leaving them in fragments the
 *      cache once per partner and costs a cold origin fetch each time.
 *   3. A customer sharing their address bar should not silently pass a coach's referral on.
 *
 * `replaceState` rather than a redirect: no extra request, no flash, and it does not add a history
 * entry the back button would bounce off.
 *
 * @returns the code that is now stored, or null.
 */
export function captureReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const raw = url.searchParams.get(REFERRAL_PARAM);
  if (!raw) return readReferralCode();

  if (!isValidReferralCode(raw)) {
    // Malformed — drop it from the URL anyway so it cannot be indexed, but store nothing.
    url.searchParams.delete(REFERRAL_PARAM);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    return readReferralCode();
  }

  writeCookie(raw);
  url.searchParams.delete(REFERRAL_PARAM);
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  return raw;
}

/** The shareable link for a partner code. Used in the partner dashboard's copy button. */
export function buildReferralLink(code: string, path = '/'): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://protein.tn';
  const url = new URL(path, base);
  url.searchParams.set(REFERRAL_PARAM, code);
  return url.toString();
}
