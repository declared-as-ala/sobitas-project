import { unstable_cache } from 'next/cache';
import { getShopPage } from '@/services/api';
import { EMPTY_SHOP_QUERY } from '@/util/shopQuery';
import { isInStock } from '@/util/cartStock';
import { getEffectivePrice } from '@/util/productPrice';
import { buildGenericBrandMetaDescription, withCashOnDeliveryTail } from '@/util/brandMeta';
import { resolveCategoryMetaDescription } from '@/util/resolveCategorySeo';
import { getBrandSeoEntry } from '@/config/brandSeoConfig';

/** Brand-wide count and cheapest buyable price, independent of visitor filters. */
export async function loadBrandStockFacts(brandId: number) {
  const scoped = { ...EMPTY_SHOP_QUERY, brands: [brandId], inStock: true };
  const cached = unstable_cache(async () => {
    const countPage = await getShopPage(scoped, 1);
    if (!countPage.pagination) throw new Error(`Missing in-stock pagination for brand ${brandId}`);
    const filteredTotal = countPage.pagination.total;
    if (filteredTotal === 0) return { inStockCount: 0, priceMin: null, priceMax: null };

    // Promo prices may be lower than the first row sorted by base price.
    const prices: number[] = [];
    let inStockCount = 0;
    for (let page = 1; page <= Math.ceil(filteredTotal / 100); page += 1) {
      const result = await getShopPage({ ...scoped, page }, 100);
      if (!result.pagination || result.pagination.total !== filteredTotal) {
        throw new Error(`Incomplete in-stock prices for brand ${brandId}`);
      }
      for (const product of result.products) {
        if (isInStock(product)) {
          inStockCount += 1;
          const price = getEffectivePrice(product);
          if (Number.isFinite(price) && price > 0) prices.push(price);
        }
      }
    }
    return {
      inStockCount,
      priceMin: prices.length ? Math.round(Math.min(...prices)) : null,
      priceMax: prices.length ? Math.round(Math.max(...prices)) : null,
    };
  }, ['brand-stock-facts', String(brandId)], { revalidate: 600, tags: ['shop', 'products'] });

  return cached().catch((error) => {
    console.error('[brand] scoped stock facts unavailable:', error);
    return null;
  });
}

/**
 * The brand page's <meta description>, resolved against live facts.
 *
 *   - Curated: the entry's text with {prixMin} {prixMax} {nbEnStock} {nbProduits} resolved (a
 *     sentence whose fact is unknown today is dropped whole), then rule D3 (withCashOnDeliveryTail):
 *     a resolved text of 130 characters or fewer gains « Paiement à la livraison. ». D3 applies to
 *     curated descriptions without tokens too. Only a description with tokens costs the facts lookup.
 *   - Generic: the live sentence builder, under the brand's display name.
 *
 * `productCount` is the listing total the caller already holds; it feeds {nbProduits}.
 */
export async function brandDescriptionWithFacts(
  brandId: number,
  brandName: string,
  slug: string,
  categoryNames: string[],
  productCount?: number
): Promise<string> {
  const configured = getBrandSeoEntry(slug);
  const count = typeof productCount === 'number' && productCount > 0 ? productCount : null;
  if (configured) {
    if (!configured.metaDescription.includes('{')) return withCashOnDeliveryTail(configured.metaDescription);
    const facts = await loadBrandStockFacts(brandId);
    return withCashOnDeliveryTail(resolveCategoryMetaDescription(configured.metaDescription, {
      priceMin: facts?.priceMin ?? null,
      priceMax: facts?.priceMax ?? null,
      inStockCount: facts?.inStockCount ?? null,
      productCount: count,
    }));
  }
  const facts = await loadBrandStockFacts(brandId);
  return buildGenericBrandMetaDescription(brandName, categoryNames, productCount, facts);
}
