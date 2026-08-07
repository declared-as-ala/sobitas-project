/**
 * Single source of truth for product promo and effective price (API: prix, promo, promo_expiration_date).
 * - promo != null and (no expiration or future expiration) → promo is valid, use promo price.
 * - Otherwise → use prix (original price).
 * - If promo_expiration_date is invalid (parse failed), promo is considered inactive.
 */

export type ProductLike = {
  prix?: number;
  price?: number | null;
  promo?: number | null;
  promo_expiration_date?: string | null;
};

/**
 * Parse API expiration "YYYY-MM-DD HH:mm:ss" to timestamp (ms).
 * Returns null if expiration is null/empty or if parsing fails (robustness: invalid date → treat promo inactive).
 */
export function parsePromoDate(expiration: string | null | undefined): number | null {
  if (expiration == null || String(expiration).trim() === '') return null;
  const isoLike = String(expiration).trim().replace(' ', 'T');
  const ts = new Date(isoLike).getTime();
  return Number.isFinite(ts) ? ts : null;
}

/**
 * True when product has an active promo:
 * - promo exists and > 0
 * - promo < prix (safety)
 * - If promo_expiration_date exists: active only if expiration > now (or parsing failed → inactive)
 * - If promo_expiration_date is null: active
 */
export function isPromoActive(product: ProductLike): boolean {
  const p = product;
  const prix = (p as any).prix ?? (p as any).price;
  if (p.promo == null || p.promo === undefined) return false;
  const promoNum = Number(p.promo);
  if (!Number.isFinite(promoNum) || promoNum <= 0) return false;
  if (prix != null && Number(prix) <= promoNum) return false; // promo must be < prix

  const expiration = p.promo_expiration_date;
  if (expiration == null || String(expiration).trim() === '') return true;
  const expirationMs = parsePromoDate(expiration);
  if (expirationMs === null) return false; // invalid date → consider promo inactive
  return expirationMs > Date.now();
}

/** True when product has a valid promo (alias for isPromoActive). Kept for backward compatibility. */
export function hasValidPromo(product: ProductLike): boolean {
  return isPromoActive(product);
}

/** Effective unit price: promo if active, else prix/price. Used for display and cart/checkout. */
export function getEffectivePrice(product: ProductLike): number {
  if (isPromoActive(product)) return Number(product.promo);
  // Prefer the LIVE `prix` over the ad-hoc snapshot `price` (which cart/card code freezes at
  // add-to-cart time). When a promo expires while the item sits in the cart, the frozen `price`
  // still held the old promo amount — so the cart showed e.g. 149 DT while the backend charged
  // the real 180 DT. `prix` first makes display match the invoice (matches getPriceDisplay/isPromoActive).
  return (product as any).prix ?? (product as any).price ?? 0;
}

export type PriceDisplay = {
  finalPrice: number;
  oldPrice: number | null;
  hasPromo: boolean;
};

/**
 * Single place for ProductCard/listing price display.
 * - finalPrice: price to show as main (promo if active, else prix)
 * - oldPrice: prix to show crossed out, or null if no active promo
 * - hasPromo: true only when promo is active (show old price strikethrough)
 */
export function getPriceDisplay(product: ProductLike): PriceDisplay {
  const prix = (product as any).prix ?? (product as any).price ?? 0;
  const prixNum = Number(prix);
  const basePrice = Number.isFinite(prixNum) ? prixNum : 0;

  if (isPromoActive(product) && product.promo != null) {
    const promoNum = Number(product.promo);
    return {
      finalPrice: Number.isFinite(promoNum) ? promoNum : basePrice,
      oldPrice: basePrice > 0 ? basePrice : null,
      hasPromo: true,
    };
  }
  return {
    finalPrice: basePrice,
    oldPrice: null,
    hasPromo: false,
  };
}

/**
 * A price as the shop writes it: "180 DT", "24,5 DT".
 *
 * Lifted out of CrawlerProductView so the comparison table renders identical prices on the human
 * page and the crawler page. Two formatters would be two chances to disagree, on the one number a
 * customer checks hardest.
 *
 * Trailing zeros are trimmed ONLY in the fractional part. The obvious `.replace(/\.?0+$/, '')` also
 * eats the trailing zero of a whole number — turning 180 into "18" and 300 into "3" — which shipped
 * once and showed wrong prices on every round-numbered product.
 */
export function formatTnd(n: number): string {
  const value = Math.round((Number.isFinite(n) ? n : 0) * 1000) / 1000;
  const s = value.toString();
  // Decimal POINT, not a French comma. The rest of the product page renders the raw number
  // ("24.5 DT"), and the crawler view must show a customer and Googlebot the same price string —
  // a comma here would be a content discrepancy on the one number that matters most. Switching the
  // whole site to French notation is a separate, deliberate change.
  const clean = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
  return `${clean} DT`;
}
