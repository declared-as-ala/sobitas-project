import { unstable_cache } from 'next/cache';
import { getShopPage } from '@/services/api';
import { isInStock } from '@/util/cartStock';
import { getEffectivePrice } from '@/util/productPrice';
import { EMPTY_SHOP_QUERY, type ShopQuery } from '@/util/shopQuery';

/** Category-wide availability and buyable non-pack price bounds, independent of visitor filters. */
export async function loadCategoryStockFacts(scope: Partial<ShopQuery>) {
  const scoped = { ...EMPTY_SHOP_QUERY, ...scope, inStock: true };
  const scopeKey = scope.subcategories?.[0]
    ? `subcategory:${scope.subcategories[0]}`
    : `category:${scope.categories?.[0] ?? 'shop'}`;
  const cached = unstable_cache(async () => {
    const countPage = await getShopPage(scoped, 1);
    if (!countPage.pagination) throw new Error(`Missing in-stock pagination for ${scopeKey}`);
    const inStockCount = countPage.pagination.total;
    if (inStockCount === 0) return { inStockCount: 0, priceMin: null, priceMax: null };

    const prices: number[] = [];
    for (let page = 1; page <= Math.ceil(inStockCount / 100); page += 1) {
      const result = await getShopPage({ ...scoped, page }, 100);
      if (!result.pagination || result.pagination.total !== inStockCount) {
        throw new Error(`Incomplete in-stock prices for ${scopeKey}`);
      }
      for (const product of result.products) {
        if (isInStock(product) && Number(product.pack) !== 1 && !/^pack-/i.test(product.slug ?? '')) {
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
  }, ['category-stock-facts', scopeKey], { revalidate: 600, tags: ['shop', 'products'] });

  return cached().catch((error) => {
    console.error('[category] scoped stock facts unavailable:', error);
    return null;
  });
}
