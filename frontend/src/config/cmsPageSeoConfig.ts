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
  'proteine-tunisie': {
    navLabel: 'Guide : bien choisir sa protéine',
    titleOverride: 'Comment choisir sa protéine ? Guide Tunisie | Protein.tn',
    headingOverride: 'Comment choisir sa protéine ? Le guide',
    commercialIntro: 'Vous voulez acheter directement ?',
    commercialLinks: [
      {
        anchor: 'protéine en Tunisie',
        href: '/proteines',
        hint: 'Tout le catalogue : whey, isolate, caséine, végétale — prix et stock du jour.',
      },
      {
        anchor: 'whey protein en Tunisie',
        href: '/whey-proteine',
        hint: 'La catégorie whey, marque par marque, avec les formats disponibles.',
      },
    ],
  },
  /*
   * The same shape as /proteine-tunisie, one page later. /creatine-monohydrate-tunisie is a
   * ~1,200-word guide with no products, no FAQPage and no CollectionPage; its only route toward
   * the catalogue is a CMS-authored button pointing at the legacy /category/creatine, which 308s.
   * So it answers the "créatine monohydrate tunisie" query in Google's index (28 d: 0 clicks /
   * 39 impressions / position 13.6) without ever handing that intent to /creatine (2 / 204 / 22).
   *
   * NO `titleOverride` here, deliberately. The live <title> is already guide-framed ("Créatine
   * Monohydrate en Tunisie : guide expert & prix 2026") and it is what earns those impressions;
   * rewriting it would risk the only thing the page does well.
   *
   * ── WHAT `headingOverride` DOES AND DOES NOT DO ON THIS PAGE (verified 22/09/2026) ──────────
   * It does NOT replace the H1 here, unlike on /proteine-tunisie. PageContentClient strips only a
   * LEADING <h1> from the CMS body (anchored regex, PageContentClient.tsx:50). This body does not
   * open with its heading — it opens with a <div> holding a JSON-LD <script>, then a
   * <section class="wh-hero">, and the <h1> is nested inside. So the strip misses, `bodyHasOwnH1`
   * stays true, and the override renders as the large aria-hidden <p> above the article while the
   * body's own "Créatine Monohydrate Tunisie : Le Guide Expert 2026" remains the page's single H1.
   * Measured with a Googlebot UA: /proteine-tunisie's H1 is its override; this page's H1 is still
   * the body's. What the override still buys is the biggest VISIBLE line on the page, which used
   * to repeat the bare commercial phrase (page.title) and now reads as a guide.
   * Actually moving the H1 needs PageContentClient's strip to handle a non-leading body h1 — that
   * file is out of this batch's scope; left for the owner. Do not claim this finding is closed.
   */
  'creatine-monohydrate-tunisie': {
    navLabel: 'Guide : la créatine monohydrate',
    headingOverride: 'Comment choisir sa créatine monohydrate ? Le guide',
    commercialIntro: 'Vous voulez acheter directement ?',
    commercialLinks: [
      {
        anchor: 'créatine monohydrate en Tunisie',
        href: '/creatine',
        hint: 'Toute la catégorie créatine : marques, formats et prix du jour.',
      },
    ],
  },
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
