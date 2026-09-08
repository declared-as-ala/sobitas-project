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

export function buildBrandMetaTitle(brandName: string): string {
  const configured = getBrandSeoEntry(brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  if (configured) return configured.metaTitle;
  return `${brandName} — Protéines & Compléments en Tunisie | Protéine Tunisie`;
}

export function buildBrandMetaDescription(brandName: string): string {
  const configured = getBrandSeoEntry(brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  if (configured) return configured.metaDescription;
  return `Découvrez tous les produits ${brandName} en Tunisie : qualité premium, produits 100% authentiques, livraison rapide.`;
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
export function buildBrandSocialMetadata(brandName: string, canonicalUrl: string) {
  const image = '/slides/home-hero-web.webp';
  const title = buildBrandMetaTitle(brandName);
  const description = buildBrandMetaDescription(brandName);
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
