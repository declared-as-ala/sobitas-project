import {
  buildBrandSchema,
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildFAQPageSchemaFromQA,
  buildItemListSchema,
} from '@/util/structuredData';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';
import { buildBrandMetaTitle } from '@/util/brandMeta';
import { getProductLink } from '@/util/productUrl';
import type { Brand, Product } from '@/types';

/**
 * A brand landing page's structured data, in ONE place, because it is emitted from TWO routes —
 * exactly the arrangement util/shopJsonLd.ts exists for, and for the same reason.
 *
 * ── THE TWO VIEWS WERE DESCRIBING THE PAGE DIFFERENTLY ──────────────────────────────────────
 * `middleware.ts` rewrites crawler user-agents on `/{brand-slug}` to `/x-crawler/category/{slug}`,
 * so Googlebot renders a different route than a shopper. Both emitted a CollectionPage, and the
 * two had drifted. Measured on production 08/09/2026 (`?__crawler=1` forces the crawler route
 * past the CDN's URL-keyed cache, which otherwise serves one view's HTML to the other and hides
 * the difference completely):
 *
 *     browser   name "BioTech USA Tunisie | Pure Whey & Iso Whey Zero — Protein.tn"
 *               description "BioTech USA en Tunisie : 100% Pure Whey et Iso Whey Zero 2,27 kg…"
 *     Googlebot name "Produits BIOTECH USA"
 *               description  (absent)
 *
 * Same on /optimum-nutrition, and by construction on all 55 brand pages: the human route used
 * buildBrandMetaTitle + the curated brandSeoConfig description, the crawler route hardcoded
 * `Produits ${title}` and passed no description at all. The curated copy — the whole point of the
 * brand SEO config — reached shoppers and never reached the search engine it was written for.
 * This is the fourth time this route pair has drifted; a shared builder is the only fix that
 * stays fixed.
 *
 * ── THE BRAND NODE ──────────────────────────────────────────────────────────────────────────
 * Every product on the site already points its `brand` at this page's URL as an `@id`. Nothing
 * defined that identifier. `about` does, here, on the brand's own page. See buildBrandSchema.
 */
export function buildBrandLandingSchemas({
  brand,
  products,
  slug,
  baseUrl,
}: {
  brand: Brand;
  products: Product[];
  /** The slug this page is SERVED at — the one middleware resolved, not a re-derived one. */
  slug: string;
  baseUrl: string;
}): object[] {
  const path = `/${slug}`;
  const brandSeo = getBrandSeoEntry(slug);
  const title = buildBrandMetaTitle(brand.designation_fr);
  const description =
    brandSeo?.metaDescription ||
    `Tous les produits ${brand.designation_fr} en Tunisie : qualité premium, produits authentiques, livraison rapide partout dans le pays.`;

  const breadcrumb = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Boutique', url: '/shop' },
      { name: brand.designation_fr, url: path },
    ],
    baseUrl,
    { pageUrl: path }
  );

  const listItems = (Array.isArray(products) ? products : [])
    .filter((p) => p && p.designation_fr)
    .map((p) => ({ name: p.designation_fr || 'Produit', url: getProductLink(p) }))
    .filter((p) => p.url && p.url !== '/shop/');

  const collection = buildCollectionPageSchema(title, path, baseUrl, {
    description,
    withBreadcrumb: true,
    withItemList: listItems.length > 0,
    about: buildBrandSchema(brand, baseUrl) ?? undefined,
  });

  const itemList =
    listItems.length > 0
      ? buildItemListSchema(listItems.slice(0, 20), baseUrl, {
          name: `Produits ${brand.designation_fr}`,
          pageUrl: path,
        })
      : null;

  // FAQ only when the curated entry exists — and only because both views render those same Q&As
  // as visible text. FAQ markup without matching on-page content is a policy violation.
  const faq = brandSeo ? buildFAQPageSchemaFromQA(brandSeo.faqs) : null;

  return [breadcrumb, collection, ...(itemList ? [itemList] : []), ...(faq ? [faq] : [])];
}
