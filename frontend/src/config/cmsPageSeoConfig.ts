/**
 * SEO overlay for CMS-authored pages (`/{slug}`, `/page/{slug}` and the `/x-crawler/category`
 * route that serves the same URLs to bots).
 *
 * ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────────────────────
 * Phase 2: the homepage owns the brand query, /proteines is the catalogue, and this CMS page
 * answers how to choose. The title has to be shared across the root, legacy CMS and crawler
 * metadata paths; otherwise the older Filament title keeps claiming the homepage query on one
 * render path while the browser sees the new one.
 *
 * ── P1, 08/09/2026: /proteine-tunisie IS A DEAD END WEARING A COMMERCIAL TITLE ───────────────
 * Measured from the SemRush TN export of 08/09/2026 plus live Googlebot-UA fetches:
 *
 *     `proteine tunisie`   880 vol, KD 7    /  ranks 10   /proteines 45   /proteine-tunisie 68
 *
 * /proteine-tunisie is a 1,169-word editorial WebPage with NO products, NO FAQPage and NO
 * CollectionPage. It holds 8 keywords and 0 traffic. And the footer's "Services & Ventes" CMS
 * list renders the anchor "Proteine Tunisie" → /proteine-tunisie on EVERY page of the site: the
 * strongest exact-match commercial anchor we own is spent on the weakest commercial page we own.
 *
 * It is NOT redirected. redirects.js (see the "/page/{slug} -> /{slug}" block) records that both
 * /proteine-tunisie and /page/proteine-tunisie return 200 and both carry real Search Console
 * impressions — 301'ing either would throw that away, and the catch-all that makes them resolve
 * is load-bearing for other URLs.
 * SUPERSEDED 05/10/2026: both URLs now 301 to /proteines — see the RETIRED note below.
 *
 * So the page is retargeted instead of retired:
 *   titleOverride    stops it competing head-on for the bare commercial phrase
 *   headingOverride  same, for the visible H1 (the CMS body's own <h1> is the accented
 *                    "Protéine Tunisie : Guide complet…"; see PageContentClient)
 *   commercialLinks  routes the intent UP, high in the body, with anchors that carry the query
 *   navLabel         (22/09/2026) closes the footer half of the same problem, which the note
 *                    above described but did not fix — FooterClient now prints this instead of
 *                    the CMS title. /creatine-monohydrate-tunisie got the same treatment the
 *                    same day; it is the second and last commercial guide in that column.
 *
 * Anything a page does not declare here is left exactly as the CMS authored it.
 */

export interface CmsPageCommercialLink {
  /** Anchor text. Carries the query — this is the whole point of the block. */
  anchor: string;
  href: string;
  /** One line of context under the anchor. Kept short: this is a routing block, not an essay. */
  hint: string;
}

export interface CmsPageSeoEntry {
  /**
   * Anchor text wherever the site's own chrome links this page — today the footer's
   * "Services & Ventes" column, which renders on every page. The footer used to print the raw CMS
   * title, so the two strongest exact-match anchors the site owns ("Proteine Tunisie",
   * "Créatine Monohydrate Tunisie") were spent sitewide on guide pages that sell nothing, while
   * /proteines and /creatine sat at positions 19 and 22. A nav label describes the PAGE
   * ("Guide : …"); the commercial phrase belongs to the category link one column to the left.
   * The link itself is kept — the guides would otherwise have no inbound link but the sitemap.
   */
  navLabel?: string;
  /** <title>, shared by the root, /page/ and crawler metadata paths. */
  titleOverride?: string;
  /**
   * Visible H1. When set, PageContentClient renders it as the page's single <h1> and drops the
   * CMS body's own leading <h1> (which the prose styles already hide with
   * `[&>h1:first-child]:hidden`, so nothing disappears from the screen that was ever on it).
   */
  headingOverride?: string;
  /** Lead-in above the commercial links. Plain text — never HTML. */
  commercialIntro?: string;
  /** Rendered high in the body, directly under the page hero. */
  commercialLinks?: CmsPageCommercialLink[];
}

const CMS_PAGE_SEO_CONFIG: Record<string, CmsPageSeoEntry> = {
  /*
   * RETIRED 05/10/2026 — /proteine-tunisie and /page/proteine-tunisie now 301 to /proteines
   * (redirects.js) and the slug is in RETIRED_CMS_PAGES below, so its overlay is gone.
   * Why: product-less guide on the head-term URL, 0 clicks @80–85 (28 d) while /proteines rose 47.6 → 13.7.
   */
  /*
   * RETIRED 30/09/2026 — /creatine-monohydrate-tunisie now 301s to /creatine (redirects.js), so
   * its overlay is gone. Kept as the record of why it was a problem:
   * The same shape as /proteine-tunisie, one page later. /creatine-monohydrate-tunisie is a
   * ~1,200-word guide with no products, no FAQPage and no CollectionPage; its only route toward
   * the catalogue is a CMS-authored button pointing at the legacy /category/creatine, which 308s.
   * So it answers the "créatine monohydrate tunisie" query in Google's index (28 d: 0 clicks /
   * 39 impressions / position 13.6) without ever handing that intent to /creatine (2 / 204 / 22).
   *
   * The page has impressions but no measured clicks, so it is retargeted cleanly rather than left
   * with a title/H1 that duplicates /creatine's commercial promise. PageContentClient removes the
   * first CMS-authored H1 wherever it sits in the body, then emitted a guide-specific H1 once.
   */
};

/** Normalises the several shapes a slug arrives in (leading slash, trailing slash, query). */
function normaliseSlug(slug: string): string {
  return String(slug ?? '')
    .trim()
    .replace(/^\//, '')
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '')
    .toLowerCase();
}

export function getCmsPageSeoEntry(slug: string): CmsPageSeoEntry | undefined {
  return CMS_PAGE_SEO_CONFIG[normaliseSlug(slug)];
}

export function getCmsPageTitleOverride(slug: string): string | undefined {
  return getCmsPageSeoEntry(slug)?.titleOverride;
}

/** Anchor text for a CMS page in the site chrome; `undefined` means "use the CMS title". */
export function getCmsPageNavLabel(slug: string): string | undefined {
  return getCmsPageSeoEntry(slug)?.navLabel;
}

/**
 * CMS pages folded into the catalogue: slug → the URL its 301 in redirects.js lands on.
 *
 * The FRONTEND owns the retirement, not the database. A migration also sets each row INACTIVE so
 * GET /api/pages stops listing it, but the frontend and backend deploys start in parallel from the
 * same push (and the owner cherry-picks commits one at a time), so nothing guarantees the row is
 * gone when this bundle goes live. Until it is, /api/pages still returns the row and the footer
 * would print its raw CMS title ("Proteine Tunisie") as a sitewide anchor into a redirect, and
 * pages.xml would submit a URL that 308s. getCmsPages() and the sitemap's CMS source both drop
 * these slugs, so either DB state renders the same site.
 *
 * Add a slug here in the same change as its redirects.js rule.
 */
export const RETIRED_CMS_PAGES: Readonly<Record<string, string>> = Object.freeze({
  'proteine-tunisie': '/proteines',
  'creatine-monohydrate-tunisie': '/creatine',
});

/** True when `slug` is a CMS page that now redirects (see RETIRED_CMS_PAGES). */
export function isRetiredCmsPageSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(RETIRED_CMS_PAGES, normaliseSlug(slug));
}
