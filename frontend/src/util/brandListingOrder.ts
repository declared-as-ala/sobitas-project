/**
 * A brand's product listing in the order the SHOPPER's grid shows it — for every other view of
 * the same page.
 *
 * ShopPageClient's default sort is 'popularity' (best_seller × 2 + new_product, descending), then a
 * stable « buyable first » pass that floats every in-stock product above the rest. The crawler
 * grid, the ItemList JSON-LD, the share-image pick and the « en stock » table all used the raw API
 * order instead, so the product Googlebot saw first was not the one a shopper saw first. Both
 * sorts here are stable (Array#sort is, since ES2019), exactly like the client's.
 *
 * It also attaches `brand`: the /productsByBrandId listing rows carry `brand_id` only, while
 * humanProductHeading (the ItemList names) and buildProductAlt (the image alts) need
 * `product.brand.designation_fr` to place the brand once in the heading.
 */
import type { Brand, Product } from '@/types';
import { isInStock } from '@/util/cartStock';

type ListingBrand = { id: number; designation_fr: string; logo?: string | null };

function popularity(product: Product): number {
  return (Number(product.best_seller ?? 0) || 0) * 2 + (Number(product.new_product ?? 0) || 0);
}

export function orderBrandListing<T extends Product>(products: T[], brand?: ListingBrand): T[] {
  const relation: Brand | null = brand
    ? { id: brand.id, designation_fr: brand.designation_fr, ...(brand.logo ? { logo: brand.logo } : {}) }
    : null;
  const rows = (Array.isArray(products) ? products : [])
    .filter((product) => product && typeof product.designation_fr === 'string' && product.designation_fr.trim())
    .map((product) => (relation && !product.brand ? { ...product, brand: relation } : product));
  const byPopularity = [...rows].sort((a, b) => popularity(b) - popularity(a));
  return byPopularity.sort((a, b) => Number(isInStock(b)) - Number(isInStock(a)));
}
