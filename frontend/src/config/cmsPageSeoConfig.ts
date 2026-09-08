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
