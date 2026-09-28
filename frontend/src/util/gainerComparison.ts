import type { Brand, Product } from '@/types';
import { extractFormat } from '@/util/productComparison';
import { getPriceDisplay } from '@/util/productPrice';
import { getProductStockStatus } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';

export type GainerRow = {
  id: number | string;
  name: string;
  url: string;
  brand: string;
  format: string;
  price: number;
  oldPrice: number | null;
  pricePerKilo: number | null;
};

/** Accept one literal, unambiguous mass in the name; never interpret thousands separators. */
function statedKilograms(name: string): number | null {
  if (/\b\d+\s*[x×]\s*\d/i.test(name)) return null;
  const matches = [...name.matchAll(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(kg|grs?|g)\b/gi)];
  if (matches.length !== 1) return null;
  const [, raw, unit] = matches[0];
  // "2.267 kg" and "2,267 g" occur in this catalogue and have conflicting readings.
  if (/[.,]\d{3}$/.test(raw)) return null;
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return null;
  const kg = unit.toLowerCase() === 'kg' ? value : value / 1000;
  return kg >= 0.1 && kg <= 30 ? kg : null;
}

/** Listing projection has no per-serving nutrition, so this builder does not read or infer it. */
export function buildGainerRows(products: Product[], brands: Brand[] = []): GainerRow[] {
  const brandName = new Map(brands.map((brand) => [brand.id, brand.designation_fr]));
  const seen = new Set<string>();
  return products
    .filter((product) => {
      if (!product?.id || !product.designation_fr || seen.has(String(product.id))) return false;
      const stock = getProductStockStatus(product);
      if (stock.isUnknown || stock.isOutOfStock || Number(product.pack) === 1 || /^\s*pack\b/i.test(product.designation_fr)) return false;
      seen.add(String(product.id));
      return true;
    })
    .map((product) => {
      const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(product);
      const kilograms = statedKilograms(product.designation_fr);
      return {
        id: product.id,
        name: product.designation_fr,
        url: getProductLink(product),
        brand: (product.brand?.designation_fr ?? brandName.get(Number(product.brand_id)) ?? '').trim(),
        format: extractFormat(product.designation_fr),
        price: finalPrice,
        oldPrice: hasPromo && oldPrice != null && oldPrice > finalPrice ? oldPrice : null,
        pricePerKilo: kilograms && finalPrice > 0 ? finalPrice / kilograms : null,
      };
    })
    .sort((a, b) => (a.pricePerKilo ?? Infinity) - (b.pricePerKilo ?? Infinity) || a.price - b.price);
}
