/**
 * Brand landing-page title and description, in ONE place.
 *
 * A brand page is served by two different route files — `(shop)/[slug]/page.tsx` for humans and
 * `x-crawler/category/[slug]/page.tsx` for crawler user-agents, which middleware rewrites to.
 * Each had its own copy of these strings, and they had drifted:
 *
 *   human : "ACTIVLAB — Protéines & Compléments en Tunisie | Protéine Tunisie"
 *   bot   : "ACTIVLAB - Protéines & Compléments Tunisie | Protéine Tunisie"
 *
 * Same URL, two different titles depending on who asked. Google indexes the crawler variant, so
 * the title that ranks was the one nobody was reviewing. Dynamic rendering is only defensible
 * while both views say the SAME thing — divergence is what separates it from cloaking.
 */
import { getBrandSeoEntry } from '@/config/brandSeoConfig';

function configEntryFor(brandName: string) {
  return getBrandSeoEntry(brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
}

/** ~60 characters is where Google starts truncating a French SERP title on mobile. */
const TITLE_BUDGET = 60;

/**
 * ── THE DEFAULT TITLE HAD TO FORM "{MARQUE} TUNISIE" ─────────────────────────────────────────
 * 579 brand URLs are in the sitemap and only 17 have a curated entry, so the other 562 all
 * carried `"{Brand} — Protéines & Compléments en Tunisie | Protéine Tunisie"` — the same string
 * 562 times, whose only variable is the name, and which never puts the brand next to the country.
 * The query shape that converts on this site is the bigram: `dymatize tunisie`, `ostrovit
 * tunisie`, `biotech usa tunisie`, `muscletech tunisie` (GSC), and every curated title leads with
 * it. The old default split the two across nine words.
 *
 * It was also factually wrong on a large part of the catalogue: Boiron (homéopathie), Centrum,
 * OLLY and Pink Stork sell no protein at all, and stamping "Protéines" on them repeated a weak
 * generic signal against /proteines 562 times.
 *
 * `categoryNames` is the brand's OWN sub-category names, read off its product listing, so the
 * title states what the page actually lists. It is optional because both route files — the human
 * `(shop)/[slug]` and the crawler `x-crawler/category/[slug]` that middleware sends bots to —
 * must pass it in the SAME change or the two views of one URL would announce different titles,
 * which is the drift this whole file exists to prevent (see the header). Until then both fall
 * through to the no-category form below, identically.
 */
export function buildBrandMetaTitle(brandName: string, categoryNames?: string[]): string {
  const configured = configEntryFor(brandName);
  if (configured) return configured.metaTitle;

  const cats = normaliseCategoryNames(categoryNames);
  // Drop trailing categories rather than let the brand+geo part be the thing that gets cut off.
  for (let take = Math.min(cats.length, 3); take > 0; take -= 1) {
    const candidate = `${brandName} Tunisie : ${cats.slice(0, take).join(', ')} | Protein.tn`;
    if (candidate.length <= TITLE_BUDGET) return candidate;
  }

  return `${brandName} Tunisie | Compléments alimentaires — Protein.tn`;
}

export function buildBrandMetaDescription(brandName: string, categoryNames?: string[]): string {
  const configured = configEntryFor(brandName);
  if (configured) return configured.metaDescription;

  const cats = normaliseCategoryNames(categoryNames).slice(0, 4);
  if (cats.length) {
    return `${brandName} en Tunisie sur Protein.tn : ${cats.join(', ')}. Produits 100% authentiques, livraison rapide.`;
  }
  return `Découvrez tous les produits ${brandName} en Tunisie : qualité premium, produits 100% authentiques, livraison rapide.`;
}

/** Trim, drop blanks, de-duplicate case-insensitively, preserve the caller's order. */
function normaliseCategoryNames(names: string[] | undefined): string[] {
  if (!Array.isArray(names)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = String(raw ?? '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/**
 * The social card, here for the same reason the title is — and because it had drifted the same
 * way. The human route declared `/slides/home-hero-web.webp` with dimensions and alt text; the
 * crawler route declared no openGraph at all, so every brand page fell through to the root
 * layout's generic `/og-banner.jpg`. Caught 08/09/2026 by check-crawler-parity.mjs against a
 * local production build:
 *
 *     googlebot https://protein.tn/og-banner.jpg
 *     browser   https://protein.tn/slides/home-hero-web.webp
 *
 * og:image is the third field this route pair has diverged on, and the first one it diverged on
 * ever. Neither image is brand-specific — there is no per-brand social artwork to use, and the
 * admin brand logos are 404-prone (see FeaturedBrands.tsx) — so this states the reviewed one of
 * the two, with the width/height/alt the unfurlers want, from both routes.
 */
export function buildBrandSocialMetadata(brandName: string, canonicalUrl: string, categoryNames?: string[]) {
  const image = '/slides/home-hero-web.webp';
  // Same builders as the <title>/<meta description> on the same page — an og:title that disagrees
  // with the title is the fourth way this route pair could drift.
  const title = buildBrandMetaTitle(brandName, categoryNames);
  const description = buildBrandMetaDescription(brandName, categoryNames);
  return {
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website' as const,
      images: [{ url: image, width: 1200, height: 630, alt: `${brandName} — Protéine Tunisie` }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image],
    },
  };
}
