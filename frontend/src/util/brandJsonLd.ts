import {
  buildBrandSchema,
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildFAQPageSchemaFromQA,
  buildItemListSchema,
} from '@/util/structuredData';
import { buildBrandMetaDescription, buildBrandMetaTitle } from '@/util/brandMeta';
import { getBrandCategoryNames } from '@/util/brandCategoryNames';
import { orderBrandListing } from '@/util/brandListingOrder';
import { humanProductHeading } from '@/util/productMetaDescription';
import { resolveCategoryMetaDescription } from '@/util/resolveCategorySeo';
import { getProductLink } from '@/util/productUrl';
import type { Brand, Product } from '@/types';
import { SHARED_SUR_COMMANDE_QAS, type BrandPageCopy } from '@/util/brandTemplate';

/**
 * A brand landing page's structured data, in ONE place, because it is emitted from TWO routes —
 * exactly the arrangement util/shopJsonLd.ts exists for, and for the same reason.
 *
 * ── THE TWO VIEWS WERE DESCRIBING THE PAGE DIFFERENTLY ──────────────────────────────────────
 * `middleware.ts` rewrites crawler user-agents on `/{brand-slug}` to `/x-crawler/category/{slug}`,
 * so Googlebot renders a different route than a shopper. Both emitted a CollectionPage, and the
 * two had drifted (08/09/2026: browser « BioTech USA Tunisie | … », Googlebot « Produits BIOTECH
 * USA » with no description). A shared builder is the only fix that stays fixed.
 *
 * ── EVERY NODE NOW READS THE SAME VALUES THE PAGE PRINTS (05/10/2026) ─────────────────────────
 *   - CollectionPage.name is buildBrandMetaTitle WITH the brand's family names — the <title>.
 *     Without them it disagreed with the <title> on every generic brand (/true-sea-moss).
 *   - description is the resolved <meta description> the route passes in.
 *   - the breadcrumb and ItemList name the brand by its display name, not the database row.
 *   - ItemList entries are in the grid's own order (orderBrandListing) and named with the
 *     humanised product heading (the H1 of each product page), so « PACK GAIN MUSCULAIRE RAPIDE »
 *     with its leading space no longer reaches the markup.
 *   - FAQPage is `copy.faqs`: the resolved list the page shows, curated or generic. FAQ markup
 *     without the same visible Q&A is a policy violation, so there is no second source.
 *     ONE exclusion: SUR_COMMANDE_QA (and its no-parcel-terms twin, SUR_COMMANDE_QA_BULKY). It is byte-identical on ~570 brand pages (the catalogue is
 *     ~99% sur commande), and Google's FAQPage guideline says a Q&A repeated across a site is
 *     marked up once at most. It stays visible; it is only left out of the markup. Marking up a
 *     subset of the visible FAQ is valid — marking up anything NOT visible is not.
 *   - primaryImageOfPage is the page's share image (pickBrandShareImage), so the CollectionPage,
 *     og:image and the visible grid point at the same picture.
 *
 * ── THE BRAND NODE ──────────────────────────────────────────────────────────────────────────
 * Every product on the site already points its `brand` at this page's URL as an `@id`. `about`
 * defines it, here, on the brand's own page — see buildBrandSchema. `sameAs` is the brand's
 * official site only when a curated entry states one.
 */
export function buildBrandLandingSchemas({
  brand,
  products,
  slug,
  baseUrl,
  description: resolvedDescription,
  copy,
}: {
  brand: Brand;
  products: Product[];
  /** The slug this page is SERVED at — the one middleware resolved, not a re-derived one. */
  slug: string;
  baseUrl: string;
  /** The resolved <meta description> of this page (brandDescriptionWithFacts). */
  description?: string;
  copy: BrandPageCopy;
}): object[] {
  const path = `/${slug}`;
  const list = Array.isArray(products) ? products : [];
  const categoryNames = getBrandCategoryNames(list);
  const title = buildBrandMetaTitle(brand.designation_fr, categoryNames);
  const description = resolvedDescription ?? resolveCategoryMetaDescription(
    buildBrandMetaDescription(brand.designation_fr, categoryNames),
    { priceMin: null, priceMax: null, inStockCount: null, productCount: copy.counts.total }
  );

  /*
   * "Marques", not "Boutique" — the visible trail on both routes says the same.
   *
   * Every root-level slug looks alike to a crawler: /creatine is a category, /optimum-nutrition
   * is a brand, /prise-de-masse is a rayon. Competitors buy that distinction with /brand/ and
   * /category/ prefixes; we do not move 570 brand URLs for it. The breadcrumb states the type
   * instead, and /brands is a real hub listing all of them, so the crumb is a genuine parent.
   */
  const breadcrumb = buildBreadcrumbListSchema(
    [
      { name: 'Accueil', url: '/' },
      { name: 'Marques', url: '/brands' },
      { name: copy.displayName, url: path },
    ],
    baseUrl,
    { pageUrl: path }
  );

  const listItems = orderBrandListing(list, brand)
    .map((product) => ({ name: humanProductHeading(product).trim() || 'Produit', url: getProductLink(product) }))
    .filter((item) => item.url && item.url !== '/shop/');

  const collection = buildCollectionPageSchema(title, path, baseUrl, {
    description,
    withBreadcrumb: true,
    withItemList: listItems.length > 0,
    about: buildBrandSchema(brand, baseUrl, {
      name: copy.displayName,
      sameAs: copy.officialUrl ? [copy.officialUrl] : undefined,
    }) ?? undefined,
    primaryImage: copy.shareImage ? { url: copy.shareImage.url, caption: copy.shareImage.alt } : undefined,
  });

  /*
   * NO PRE-SLICE: `numberOfItems` counts the brand as the page renders it (getProductsByBrand
   * pages through the whole catalogue). buildItemListSchema keeps its own 30-entry cap on
   * `itemListElement` for payload size, which caps the enumerated entries only, not the count.
   */
  const itemList =
    listItems.length > 0
      ? buildItemListSchema(listItems, baseUrl, {
          name: `Produits ${copy.displayName}`,
          pageUrl: path,
        })
      : null;

  const markedUpFaqs = copy.faqs.filter((qa) => !SHARED_SUR_COMMANDE_QAS.includes(qa));
  const faq = markedUpFaqs.length ? buildFAQPageSchemaFromQA(markedUpFaqs) : null;

  return [breadcrumb, collection, ...(itemList ? [itemList] : []), ...(faq ? [faq] : [])];
}
