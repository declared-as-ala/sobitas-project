/**
 * Stock validation for cart (frontend only).
 * Uses product.qte from API when available; otherwise rupture === 1 → "unlimited" (cap 999), else 0.
 */

/** Minimal product shape for stock (qte optional, rupture optional). No index signature so Product from @/types is assignable. */
export interface ProductLike {
  id: number;
  qte?: number;
  quantityInStock?: number;
  availableStock?: number;
  rupture?: number;
}

export interface CartItemLike {
  product: ProductLike;
  quantity: number;
}

/**
 * Stock disponible pour un produit.
 * Priorité: qte > quantityInStock > availableStock > (rupture === 1 ? 999 : 0).
 */
export function getStockDisponible(product: ProductLike): number {
  const raw =
    product.qte ??
    (product as any).quantityInStock ??
    (product as any).availableStock;
  if (raw != null && typeof raw === 'number' && !Number.isNaN(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  const inStock = product.rupture === 1 || product.rupture === undefined;
  return inStock ? 999 : 0;
}

/**
 * Quantité actuelle du produit dans le panier.
 */
export function getCartQty(items: CartItemLike[], productId: number): number {
  const item = items.find((i) => i.product.id === productId);
  return item ? Math.max(0, item.quantity) : 0;
}

/**
 * Quantité max qu'on peut encore ajouter au panier pour ce produit.
 */
export function getMaxAddable(stockDisponible: number, inCartQty: number): number {
  return Math.max(0, Math.floor(stockDisponible) - Math.max(0, inCartQty));
}

/**
 * Vérifie si on peut ajouter selectedQty au panier (sans dépasser le stock).
 */
export function canAddToCart(
  productId: number,
  selectedQty: number,
  stockDisponible: number,
  items: CartItemLike[]
): boolean {
  const inCartQty = getCartQty(items, productId);
  const requestedTotal = inCartQty + selectedQty;
  return requestedTotal <= Math.floor(stockDisponible) && selectedQty > 0;
}
