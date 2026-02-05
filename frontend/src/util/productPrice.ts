/**
 * Single source of truth for product promo and effective price (API: prix, promo, promo_expiration_date).
 * - promo != null and (no expiration or future expiration) → promo is valid, use promo price.
 * - Otherwise → use prix (original price).
 */

export type ProductLike = {
  prix?: number;
  price?: number | null;
  promo?: number | null;
  promo_expiration_date?: string | null;
};

/** True when product has a valid promo: promo set and (no expiry or expiry in the future). */
export function hasValidPromo(product: ProductLike): boolean {
  const p = product;
  if (p.promo == null || p.promo === undefined) return false;
  if (p.promo_expiration_date == null || p.promo_expiration_date === '') return true;
  const exp = new Date(p.promo_expiration_date);
  return !isNaN(exp.getTime()) && exp.getTime() > Date.now();
}

/** Effective unit price: promo if valid, else prix/price. Used for display and cart/checkout. */
export function getEffectivePrice(product: ProductLike): number {
  if (hasValidPromo(product)) return (product.promo as number);
  return (product as any).price ?? (product as any).prix ?? 0;
}
