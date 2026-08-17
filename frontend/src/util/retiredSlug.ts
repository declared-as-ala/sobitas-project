/**
 * WHERE A SLUG THAT RESOLVED TO NOTHING SHOULD GO — ONE ANSWER, FOR ALL FOUR ROUTES.
 *
 * ── THE MEASUREMENT THAT MADE THIS NECESSARY ─────────────────────────────────────────────────
 * The dead-URL recovery shipped on 14–15/08/2026 was written into the two routes a BROWSER
 * reaches: `(shop)/[slug]` and `(shop)/[slug]/[productSlug]`. Googlebot reaches neither. The
 * "Feed the Crawler First" rewrite in middleware.ts sends every bot request for `/{a}/{b}` to
 * `/x-crawler/product/{b}` and every `/{a}` to `/x-crawler/category/{a}`, and those two routes
 * carried only half the recovery.
 *
 * The same 500 Search Console URLs, probed against production on 17/08/2026 with two user agents:
 *
 *     Chrome UA      4 still 404
 *     Googlebot UA  10 still 404
 *
 * Every extra failure was a `/{category}/{product}` path, and Search Console reports what
 * GOOGLEBOT got. So the URLs stayed in the "Not found (404)" bucket while every check run from a
 * desktop said they were fixed:
 *
 *     /eaa/beef-aminos-200-tabs                       Chrome 200   Googlebot 404
 *     /creatine/gold-creatine-300g                    Chrome 200   Googlebot 404
 *     /gainers/serious-mass-5-45kg                    Chrome 200   Googlebot 404
 *     /vitamines/vegan-vitamin-d3-k2-240-tablets-…    Chrome 200   Googlebot 404
 *
 * The first of those is the one worth naming twice: `beef-aminos-200-tabs` is API id=122,
 * `publier: true` — a product that is ON SALE. It carries no subcategory, so the human route
 * sends it to its real URL `/shop/beef-aminos-200-tabs` (200) while the crawler route read the
 * missing subcategory as "not resolvable" and served Googlebot a hard 404 for a live product.
 *
 * ── AND A CLASS NEITHER PAIR OF ROUTES HANDLED ───────────────────────────────────────────────
 * A ROOT-LEVEL product slug — `/citrulline-malate-210g-ostrovit`, the old site's flat URL shape —
 * 404s for both agents, while the product is live (API id=409) at
 * `/citrulline/citrulline-malate-210g-ostrovit`. `(shop)/[slug]` probes category, then brand, then
 * CMS page, and never asks whether the slug is a PRODUCT. The gap has been filled by hand: 17 rules
 * in Filament → Redirections and ~50 more in redirects.js, each one a single URL typed by a person,
 * and most of them pointing at a CATEGORY because that is all a human can look up quickly. Resolved
 * here they reach the product itself, which is both a better landing page and full link equity.
 *
 * ── THE ORDER IS THE DESIGN ──────────────────────────────────────────────────────────────────
 *   1. product      the slug names a live product          → its canonical URL, one 301
 *   2. -N stripped  legacy list index appended by the old site → the product behind it
 *   3. listing      a real category / subcategory / brand / CMS page
 *   4. relevance    `bestCategoryForSlug`, which demands a shared significant token
 *   5. null         genuinely gone; the caller answers 404/410 rather than guessing
 *
 * Cheapest-and-most-specific first, and every step is a LOOKUP rather than an assumption. That is
 * the whole difference from what was here before: `permanentRedirect('/' + baseSlug)` fired
 * unconditionally, so `/zzz-fake-thing-2` answered 308 → `/zzz-fake-thing` → 404 — a cached
 * redirect into a 404, which Google follows, stores, and reports under the DESTINATION's status.
 *
 * ── FAILS OPEN, LIKE EVERYTHING ELSE THAT READS THE BACKEND ──────────────────────────────────
 * A genuine 404 from the product API is an answer. A timeout, a 429 or a 5xx is not, and it is
 * RETHROWN so the caller's error boundary renders instead. These are ISR routes: swallowing a
 * transient failure here would cache a `notFound()` for a healthy product for the whole revalidate
 * window, which is the one outcome worse than the bug this file fixes.
 */
import { getCachedProductDetails } from '@/services/getCachedProductDetails';
import { getErrorStatus } from '@/util/errorStatus';
import { buildProductUrlPath } from '@/util/productUrl';
import { isTaxonomySlug, bestCategoryForSlug } from '@/util/taxonomySlugs';

/**
 * The canonical path for a live product, or null when the backend positively says it is not one.
 *
 * `buildProductUrlPath` is what makes the subcategory-less case correct rather than fatal: it
 * returns `/shop/{slug}` when a product has no subcategory, which is the URL that product is
 * actually served at. The crawler route used to treat that same condition as `notFound()`.
 *
 * Transient failures are rethrown — see the fail-open note in the file docblock.
 */
export async function productPathForSlug(slug: string): Promise<string | null> {
  if (!slug) return null;
  try {
    const product = await getCachedProductDetails(slug);
    return product?.id ? buildProductUrlPath(product) : null;
  } catch (e) {
    if (getErrorStatus(e) === 404) return null;
    throw e;
  }
}

/** Does `slug` resolve to a listing on the route asking? Category, brand and CMS page all count. */
export type ListingProbe = (slug: string) => Promise<boolean>;

export type RetiredSlugOptions = {
  /** Try a product lookup first. Off for routes that have already done one. */
  product?: boolean;
  /**
   * How to ask whether a slug is a listing. Supplied by the two `[slug]` routes, which own their
   * category/brand/CMS resolvers; omitted by the product routes, which fall back to the taxonomy
   * set that middleware uses.
   */
  listing?: ListingProbe;
};

/**
 * The destination for a slug that resolved to no page, or null when nothing is relevant enough to
 * be worth a redirect. The caller decides what "nothing" means — `notFound()` on a route, 410 in
 * middleware — because only the caller knows which statuses it can set.
 */
export async function retiredSlugDestination(
  slug: string,
  { product = false, listing }: RetiredSlugOptions = {}
): Promise<string | null> {
  const clean = (slug || '').trim();
  if (!clean) return null;

  // 1. A live product, at the URL it is really served at.
  if (product) {
    const direct = await productPathForSlug(clean);
    if (direct) return direct;
  }

  // 2. The legacy list index the old site appended (/creatine-real-pharm-300g-11).
  //    Tried only AFTER the full slug, so a real slug that merely ends in a number — omega-3,
  //    iso-100-dymatize-2-3kg, bcaa-8-1-1-400g-real-pharm — is resolved above and never stripped.
  const base = clean.replace(/-\d+$/, '');
  const stripped = base && base !== clean ? base : null;
  if (stripped && product) {
    const viaBase = await productPathForSlug(stripped);
    if (viaBase) return viaBase;
  }

  const root = stripped ?? clean;

  /*
   * 3. A real listing.
   *
   * The two branches are asymmetric on purpose. A LISTING route has already probed the full slug
   * as category, brand and CMS page before it reaches its dead end, so only the stripped base is
   * worth another three calls. A PRODUCT route has probed the full slug only as a PRODUCT, and
   * `/proteines/whey-isolate` is a pair of category slugs rather than a product — it must still
   * reach /whey-isolate, so the full slug is checked there.
   *
   * `!== false` and not `=== true`: `isTaxonomySlug` returns null when the taxonomy could not be
   * read, and unknown is not evidence of absence. Redirecting on null costs one wasted hop during
   * a backend hiccup; 404-ing on it would take live category pages down.
   */
  if (listing) {
    if (stripped && (await listing(stripped))) return `/${encodeURIComponent(stripped)}`;
  } else if ((await isTaxonomySlug(root)) !== false) {
    return `/${encodeURIComponent(root)}`;
  }

  // 4. The most relevant category — one shared significant token, or nothing at all. An
  //    irrelevant redirect is documented by Google as a soft 404: it spends the hop and earns
  //    nothing, so "nothing at all" is the better answer and the caller is told so.
  const relevant = await bestCategoryForSlug(root);
  return relevant ? `/${encodeURIComponent(relevant)}` : null;
}
