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
