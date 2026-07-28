/**
 * SEO: canonical URLs and tracking-param stripping.
 * Use for alternates.canonical so search engines consolidate signals.
 *
 * Category routes (`/[slug]`) load listing data without shop filter query strings on the
 * server; canonical should stay the clean root category URL. If you later add query-based filter variants
 * on those routes, use `metadata.robots` noindex for non-primary URLs or keep canonical without query.
 */

const TRACKING_PARAM_PATTERN = /^(?:utm_[a-z_]*|fbclid|gclid|srsltid|msclkid|mc_[a-z_]*|ref|source)$/i;

/**
 * Base URL for the site (no trailing slash).
 */
export function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  return 'https://protein.tn';
}

/**
 * Removes known tracking/click-id query params from a URL search string.
 * Keeps pagination and legitimate filters (e.g. page, search, category, brand).
 */
export function stripTrackingParams(search: string): string {
  if (!search || !search.startsWith('?')) return '';
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (!TRACKING_PARAM_PATTERN.test(key)) {
      kept.set(key, value);
    }
  });
  const s = kept.toString();
  return s ? `?${s}` : '';
}

/**
 * Builds a full canonical URL for a path and optional query.
 * Query is stripped of tracking params only; page, search, category, brand are kept.
 */
export function buildCanonicalUrl(path: string, search?: string): string {
  const base = getBaseUrl();
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const cleanSearch = search ? stripTrackingParams(search.startsWith('?') ? search : `?${search}`) : '';
  return `${base}${pathPart}${cleanSearch}`;
}

/**
 * Ensures a canonical URL always uses the production apex domain (protein.tn).
 * Rewrites legacy hosts (sobitas.tn) AND a leading `www.` to the non-www apex, so an
 * admin-supplied canonical can never point at a host that 301s (which Search Console reports
 * as "Google chose a different canonical" / duplicate www vs non-www).
 */
export function forceProteinDomain(url: string): string {
  try {
    const parsed = new URL(url);
    if (/sobitas\.tn$/i.test(parsed.hostname) || /^www\./i.test(parsed.hostname)) {
      const base = getBaseUrl();
      return `${base}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return url;
  } catch {
    return url;
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * CANONICAL GUARD
 *
 * Makes it structurally impossible to emit <link rel="canonical"> at a URL this app is KNOWN
 * to answer with a 404, a 410 or a 3xx.
 *
 * WHY: `pages.canonical_url`, `categs.canonical_url`, `sous_categories.canonical_url`,
 * `articles.seo_canonical_url`, `blog_categories.seo_canonical_url` are free-text admin fields,
 * and `forceProteinDomain` above only normalises the HOST. Two live rows currently point at
 * broken URLs — /whey-proteine -> /proteine-whey-old (404) and /materiel-de-musculation ->
 * /musculation (which 301s straight back to /materiel-de-musculation; see the warning note in
 * redirects.js about that exact loop). Either one tells Google "this page is a duplicate of a
 * page that does not exist", the single most destructive on-page signal there is.
 *
 * WHY NOT AN HTTP CHECK: this runs inside generateMetadata on ISR routes. A probe would add a
 * network round-trip to every bake and would itself be subject to the API rate limit. Every
 * check below is a pure in-process lookup.
 *
 * SAFETY INVARIANT: every rejection returns the SELF canonical, and the self canonical is always
 * live — a page that is currently rendering is by definition not a redirect source, because both
 * redirects.js (next.config) and middleware.ts run BEFORE the route. The worst case of a false
 * positive is therefore "a valid admin override is ignored" (and logged); it can never produce a
 * dead canonical.
 */

/** Comparison key: query/hash dropped, decoded, lower-cased, no trailing slash. */
function canonicalPathKey(input: string): string {
  let s = (input || '').split('?')[0].split('#')[0];
  try { s = decodeURIComponent(s); } catch { /* keep raw */ }
  s = s.toLowerCase().replace(/\/+$/, '');
  return s === '' ? '/' : s;
}

/** Slug endings the CMS uses for retired/duplicated records — these never resolve. */
const DEAD_SLUG_MARKER =
  /-(?:old|copy|copie|draft|brouillon|backup|bak|tmp|temp|deleted|supprime|dup|duplicate)(?:-?\d+)?$/i;

/**
 * First path segments that are resolver / utility routes, never an indexable destination.
 * NOTE the deliberate absences: 'shop', 'blog', 'brands', 'packs', 'offres', 'faqs', 'contact',
 * 'qui-sommes-nous', 'proteine-sousse' are REAL pages and are legitimate canonical targets.
 */
const NON_CANONICAL_SEGMENTS = new Set([
  'api', 'api-proxy', '_next', 'admin', 'cart', 'checkout', 'account', 'favoris', 'search',
  'login', 'register', 'reset-password', 'forgot-password', 'order-confirmation', 'avis',
  'product', 'products', 'produit', 'produits', 'collections', 'page', 'blogs',
  'category', 'categorie', 'categories', 'subcategories', 'product-category', 'product-tag', 'brand',
]);

/** The only canonicals deeper than two segments this app legitimately emits. */
const DEEP_CANONICAL_PREFIXES = ['/blog/category/', '/blog/tag/'];

/** Mirrors the hard-410 / forced-301 path classes in src/middleware.ts — all provably dead. */
function isKnownDeadPath(key: string): boolean {
  return (
    key.startsWith('/wp-') ||
    key === '/feed' ||
    key === '/comments/feed' ||
    key === '/trackback' ||
    key === '/xmlrpc.php' ||
    /^\/(?:tag|author|attachment)\/[^/]+$/.test(key) ||
    /^\/(?:19|20)\d{2}(?:\/\d{1,2}){1,2}$/.test(key) ||
    /^\/[^/]+\/page\/\d+$/.test(key) ||
    // middleware's resolveShopSlug 301s every /shop/:slug to /{subcat}/{slug} or /{slug}.
    /^\/shop\/[^/]+$/.test(key)
  );
}

export type CanonicalGuardResult = { url: string; usedOverride: boolean; rejectedReason?: string };

/**
 * Validate an admin-supplied canonical against the self canonical. A sane override is honoured;
 * anything empty, off-domain, self-contradictory or pointing at a path the app knows is dead
 * falls back to SELF. Returns the reason so callers can log/inspect.
 */
export async function inspectCanonicalUrl(
  override: string | null | undefined,
  selfPath: string,
  selfSearch?: string
): Promise<CanonicalGuardResult> {
  const selfUrl = buildCanonicalUrl(selfPath, selfSearch);
  const raw = (override ?? '').trim();
  if (!raw) return { url: selfUrl, usedOverride: false };

  const reject = (rejectedReason: string): CanonicalGuardResult => {
    // Server-log only. This is the owner's breadcrumb to the offending CMS row — there is no
    // other way to discover a bad canonical_url short of crawling the site.
    console.warn(`[canonical] rejected "${raw}" on ${selfPath} — ${rejectedReason}; using ${selfUrl}`);
    return { url: selfUrl, usedOverride: false, rejectedReason };
  };

  // 1. Unusable literals: whitespace/markup inside the value, or an unexpanded template
  //    placeholder such as {search_term_string} pasted out of a JSON-LD snippet.
  if (/[\s<>"'`{}\\]/.test(raw)) return reject('contains whitespace, markup or an unexpanded {placeholder}');
  // 2. Origin-hijacking form: '//evil.com' resolves OFF-ORIGIN through new URL().
  if (raw.startsWith('//')) return reject('protocol-relative URL');

  let target: URL;
  try {
    target = /^[a-z][a-z0-9+.-]*:/i.test(raw)
      ? new URL(raw)
      : new URL(raw.startsWith('/') ? raw : `/${raw}`, getBaseUrl());
  } catch {
    return reject('not a parseable URL');
  }
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    return reject(`unsupported scheme ${target.protocol}`);
  }

  // 3. Host must be ours. www./sobitas.tn are folded to the apex (they 301). Anything else is a
  //    cross-domain canonical, which hands this page's ranking to a site we do not control.
  const apex = getBaseUrl().replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
  const host = target.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== apex && host !== 'protein.tn' && host !== 'sobitas.tn') {
    return reject(`off-domain host ${target.hostname}`);
  }

  const key = canonicalPathKey(target.pathname);
  const selfKey = canonicalPathKey(selfPath);

  // 4. Self-canonical written the long way (with www, a trailing slash, or tracking params):
  //    rebuild it ourselves so exactly one clean form is ever emitted.
  if (key === selfKey) return { url: selfUrl, usedOverride: false };

  // ── Beyond this point the row claims "this page is a duplicate of ANOTHER url". That is a
  //    de-indexing claim, so the target must survive every check we can make offline. ──
  if (key === '/') return reject('a content page must not declare itself a duplicate of the homepage');

  const segments = key.split('/').filter(Boolean);
  const firstSegment = segments[0] ?? '';
  const lastSegment = segments[segments.length - 1] ?? '';

  if (lastSegment === 'undefined' || lastSegment === 'null' || lastSegment === 'nan') {
    return reject('placeholder slug (undefined/null/NaN)');
  }
  if (DEAD_SLUG_MARKER.test(lastSegment)) {
    // Catches /proteine-whey-old, /whey-copy, /page-draft… — CMS naming for retired records.
    return reject('target slug carries a retired-record marker (-old/-copy/-draft/…)');
  }
  if (firstSegment.includes('.')) {
    // A real category/brand/product slug never contains a dot (the same invariant middleware.ts
    // relies on for its crawler-rewrite dot guard). A dot here means the admin pasted a bare
    // host — 'protein.tn/whey' would otherwise become /protein.tn/whey.
    return reject('first path segment looks like a hostname, not a slug');
  }
  if (NON_CANONICAL_SEGMENTS.has(firstSegment)) {
    return reject(`/${firstSegment}/* is a resolver or utility route, not an indexable destination`);
  }
  if (segments.length > 2 && !DEEP_CANONICAL_PREFIXES.some((p) => key.startsWith(p))) {
    // Covers the WordPress-era /shop/{a}/{b}/{c} nested paths still being crawled.
    return reject('target is deeper than any URL this app serves');
  }
  if (isKnownDeadPath(key)) return reject('target matches a middleware 410/301 pattern');

  // 5. Admin redirects (Filament → Redirections). THIS is the check that catches
  //    /materiel-de-musculation -> /musculation, where /musculation 301s straight back to the
  //    page doing the pointing. Already cached in-process by the middleware (5-min TTL) so it
  //    costs no extra request on the hot path. FAILS OPEN by design — see risks/ownerActions:
  //    clearing the CMS row is the durable fix, this is only the safety net.
  try {
    const { getAdminRedirect } = await import('@/util/adminRedirects');
    const rule = await getAdminRedirect(key);
    if (rule) return reject(`target has an admin ${rule.code} rule -> ${rule.to ?? 'Gone'}`);
  } catch {
    /* fail open — a redirect-table hiccup must never break metadata generation */
  }

  // Survived every check: honour the admin override, normalised to the apex host with a single
  // trailing-slash form and tracking params stripped.
  const emitPath = target.pathname.replace(/\/+$/, '') || '/';
  return { url: `${getBaseUrl()}${emitPath}${stripTrackingParams(target.search)}`, usedOverride: true };
}

/**
 * The one call every page must use for an admin-supplied canonical.
 * Replaces the unguarded `cms.canonical_url?.trim() || buildCanonicalUrl(self)` idiom.
 */
export async function resolveCanonicalUrl(
  override: string | null | undefined,
  selfPath: string,
  selfSearch?: string
): Promise<string> {
  return (await inspectCanonicalUrl(override, selfPath, selfSearch)).url;
}
