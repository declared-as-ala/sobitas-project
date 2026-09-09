/**
 * Affiliate subdomain attribution — `ali.protein.tn` IS the referral.
 *
 * Owner: *"maybe you can do for each affiliate something like x.protein.tn as a subdomain. And he
 * sends it, and we detect that this website is opened from an affiliate subdomain."*
 *
 * This module is the PURE half: host parsing, the reserved list, the cookie contract. It performs
 * no I/O, imports nothing, and is therefore safe in the edge middleware bundle, in a route handler
 * and in the browser. The resolver that decides whether a subdomain is REAL lives next door in
 * `affiliateSubdomains.ts`, because that one talks to the backend.
 *
 * ── WHY THE STOREFRONT IS SERVED ON THE SUBDOMAIN RATHER THAN REDIRECTED ────────────────────
 * The earlier design (docs/PARTNER-SUBDOMAINS.md, and the rule this file's arrival retires from
 * redirects.js) answered `ali.protein.tn/whey` with a 307 to `protein.tn/whey?ref=ali`. It was
 * right to be afraid of duplicate storefronts — that fear is the whole reason the noindex below
 * exists — but it paid for that safety twice over:
 *
 *   1. The affiliate's hostname survived exactly one click. Everything after it read protein.tn,
 *      which is the opposite of the "looks more pro" the subdomain was for.
 *   2. It moved the cache fragmentation ONTO THE APEX. Cloudflare's cache key includes the query
 *      string (measured on this site — see util/referral.ts), so every affiliate visit minted a
 *      separate apex entry `protein.tn/whey?ref=<code>` for byte-identical HTML. Serving on the
 *      subdomain fragments by HOSTNAME instead, which keeps the fragmentation on hostnames nobody
 *      arrives at organically and leaves the apex cache — the one that serves search traffic —
 *      with a single entry per URL.
 *
 * What replaces the redirect's safety is a `X-Robots-Tag: noindex, nofollow` on every non-apex
 * host, declared in next.config.js `headers()`. It is declared THERE and not here on purpose:
 * middleware's passthrough `NextResponse.next()` has a recorded incident on this codebase where
 * mutating its headers pinned every response to HTTP 200 and turned `notFound()` into a soft 404.
 * A next.config header rule is applied to the real response whatever its status, so the noindex
 * cannot take the status code with it.
 *
 * Canonicals need no change at all: `util/canonical.ts` builds them from NEXT_PUBLIC_BASE_URL,
 * never from the request host, so every page on `ali.protein.tn` already declares
 * `https://protein.tn/…` as its canonical. noindex + apex canonical is the belt and the braces.
 */

/**
 * The apex this site is published at. Derived from the same env var `canonical.ts` uses so the
 * canonical host and the "is this the apex?" test can never disagree.
 */
export const ROOT_HOST: string = (() => {
  const raw = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return 'protein.tn';
  }
})();

/**
 * Hostnames under the apex that are NOT affiliates and must never attribute.
 *
 * `www` and `admin` are the two that matter operationally — `www` is 301'd to the apex by
 * redirects.js and `admin` is the Laravel origin — but a label is cheap to reserve and expensive
 * to un-reserve once a coach has printed it on a poster. Anything an ops change might plausibly
 * want later is claimed now.
 *
 * MIRRORED IN PHP: `App\Models\Affilie::RESERVED_SUBDOMAINS`. The admin form validates against
 * that copy; this one decides whether a live request attributes. If you add a name, add it in both
 * places or the two halves will disagree about what a valid affiliate is.
 */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  'www',
  'admin',
  'dev',
  'files',
  'next',
  'api',
  'affilie',
  'affilies',
  'app',
  'assets',
  'blog',
  'cdn',
  'ftp',
  'imap',
  'img',
  'images',
  'localhost',
  'mail',
  'media',
  'ns1',
  'ns2',
  'pop',
  'preview',
  'shop',
  'smtp',
  'staging',
  'static',
  'store',
  'test',
  'webmail',
]);

/**
 * A hostname label: 1–32 chars of lowercase alphanumerics and hyphens, never starting or ending
 * with a hyphen.
 *
 * ONE character is allowed, deliberately: the owner's own example was `x.protein.tn`. The referral
 * CODE rule in util/referral.ts stays at 3–32 because a code is typed into a checkout field by a
 * human, where two characters are a collision waiting to happen. A subdomain is clicked, never
 * typed, so it does not inherit that constraint.
 */
const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export function isValidAffiliateSubdomain(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  // `xn--` is the punycode prefix. A label that starts with it renders as a completely different
  // string in the address bar, which is a homograph surface on a hostname we hand out as identity.
  if (value.startsWith('xn--')) return false;
  return LABEL_RE.test(value) && !RESERVED_SUBDOMAINS.has(value);
}

/**
 * Extract the affiliate label from a Host header, or null when this request is not on an affiliate
 * hostname.
 *
 * Returns null — cheaply, with no allocation beyond a lowercase — for the apex itself, which is
 * ~100% of production traffic. That is the whole cost this feature adds to a normal page view.
 *
 * Deeper labels (`a.b.protein.tn`) return null: the label may not contain a dot, so a wildcard
 * certificate's one-level guarantee and this parser agree about what a valid affiliate host is.
 */
export function affiliateSubdomainFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  // Strip the port (`ali.protein.tn:3000` in local verification) and any trailing dot.
  const bare = host.toLowerCase().split(':')[0].replace(/\.$/, '');
  if (bare === ROOT_HOST) return null;
  const suffix = `.${ROOT_HOST}`;
  if (!bare.endsWith(suffix)) return null;
  const label = bare.slice(0, -suffix.length);
  if (!label || label.includes('.')) return null;
  return isValidAffiliateSubdomain(label) ? label : null;
}

/**
 * The attribution cookie.
 *
 * ── NAME ── `pt_aff`. `pt_` is this site's existing cookie prefix (`pt_ref` holds a referral CODE
 * captured from `?ref=`), and `aff` says affilié. It is a SEPARATE cookie from `pt_ref` on purpose:
 * they hold different kinds of token — a hostname label versus a promo code — resolved by
 * different backend lookups, and merging them would mean one of the two resolvers silently
 * accepting a string from the other's namespace.
 *
 * ── TTL ── 30 days. The industry norm for affiliate attribution, and already the number
 * util/referral.ts chose for `pt_ref`; two attribution windows of different lengths in one
 * storefront is a support question nobody can answer.
 *
 * ── FLAGS ──
 *   `HttpOnly`   — nothing in the browser needs to read it. The value is consumed by the Next
 *                  route handlers that proxy order creation, which read it from the request. Making
 *                  it unreadable to script removes both the exfiltration surface and the
 *                  cookie-round-trip-into-the-DOM shape that util/referral.ts had to guard against
 *                  by re-validating on read.
 *   `SameSite=Lax` — an affiliate link IS a top-level navigation, which Lax allows; it is not a
 *                  cross-site subresource, which Lax blocks.
 *   `Secure`     — set whenever the request arrived over HTTPS (read through `x-forwarded-proto`,
 *                  because behind Cloudflare → NPM the origin hop is plain HTTP). Not hardcoded
 *                  true, or the cookie would be silently dropped during local verification.
 *   `Domain=.protein.tn` — so attribution survives a hop to the apex. Without it the cookie is
 *                  host-only on `ali.protein.tn` and a 30-day window is a fiction: the visitor who
 *                  comes back a week later through Google lands on the apex and arrives as
 *                  unattributed traffic. Only set when the host really is under the apex; a local
 *                  or preview host gets a host-only cookie so verification still works.
 */
export const AFFILIATE_COOKIE = 'pt_aff';

/** 30 days, in seconds. */
export const AFFILIATE_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

/** The `Domain` attribute for a given request host, or undefined for a host-only cookie. */
export function affiliateCookieDomain(host: string | null | undefined): string | undefined {
  if (!host) return undefined;
  const bare = host.toLowerCase().split(':')[0].replace(/\.$/, '');
  return bare === ROOT_HOST || bare.endsWith(`.${ROOT_HOST}`) ? `.${ROOT_HOST}` : undefined;
}
