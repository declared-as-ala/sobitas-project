import { unstable_cache } from 'next/cache';
import { getShopPage } from '@/services/api';
import { EMPTY_SHOP_QUERY } from '@/util/shopQuery';
import { isInStock } from '@/util/cartStock';
import { getEffectivePrice } from '@/util/productPrice';
import { buildBrandMetaDescription, buildGenericBrandMetaDescription, resolveBrandMetaDescription } from '@/util/brandMeta';
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

/** Only curated descriptions with tokens need the extra API fact lookup. */
export async function brandDescriptionWithFacts(
  brandId: number,
  brandName: string,
  slug: string,
  categoryNames: string[],
  productCount?: number
): Promise<string> {
  const raw = buildBrandMetaDescription(brandName, categoryNames);
  const configured = getBrandSeoEntry(slug);
  if (configured && !configured.metaDescription.includes('{')) return raw;
  const facts = await loadBrandStockFacts(brandId);
  if (!configured) return buildGenericBrandMetaDescription(brandName, categoryNames, productCount, facts);
  return resolveBrandMetaDescription(brandName, categoryNames, {
    priceMin: facts?.priceMin ?? null,
    inStockCount: facts?.inStockCount ?? null,
  });
}
