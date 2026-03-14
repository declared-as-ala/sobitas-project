/**
 * Stock validation for cart (frontend only).
 * API semantics: rupture = 0 or false = IN STOCK; rupture = 1 or true = OUT OF STOCK.
 * qte = source of truth for quantity; rupture = explicit stock flag (0/1, false/true, or "0"/"1").
 */

/** Minimal product shape for stock. API may return rupture as number (0/1) or boolean. */
export interface ProductLike {
  id: number;
  qte?: number;
  quantityInStock?: number;
  availableStock?: number;
  rupture?: number | boolean;
  low_stock_threshold?: number;
}

export interface CartItemLike {
  product: ProductLike;
  quantity: number;
}

/** True when API says "out of stock" (rupture === true, 1, or "1"). Returns false when rupture === false, 0, or "0". */
export function isRupture(product: ProductLike): boolean {
  const r = (product as any).rupture;
  // rupture = 1 (or true, or "1") means OUT OF STOCK
  // rupture = 0 (or false, or "0") means IN STOCK
  return r === true || r === 1 || r === '1';
}

/**
 * Whether the product is in stock. Single source of truth: not rupture AND qte > 0.
 */
export function isInStock(product: ProductLike): boolean {
  if (isRupture(product)) return false;
  return Number(product.qte ?? 0) > 0;
}

/**
 * Stock disponible pour un produit. Returns 0 when rupture is true (=== 1).
 * When rupture === 0, returns quantity from qte field.
 */
export function getStockDisponible(product: ProductLike): number {
  if (isRupture(product)) return 0;
  const raw =
    product.qte ??
    (product as any).quantityInStock ??
    (product as any).availableStock;
  if (raw != null && typeof raw === 'number' && !Number.isNaN(raw) && raw >= 0) {
    return Math.floor(raw);
  }
  return 0;
}

export interface ProductStockStatus {
  qte: number;
  isOutOfStock: boolean;
  isLowStock: boolean;
  stockLabel: 'Rupture de stock' | 'Stock faible' | 'En stock';
}

/**
 * Single source of truth for product detail page: badge, CTAs, add-to-cart.
 * API semantics (rupture field):
 * - Rupture de stock (OUT OF STOCK): rupture === 1 (or true/"1") OR qte <= 0
 * - Stock faible (LOW STOCK): rupture === 0 (or false/"0") AND in stock AND qte <= low_stock_threshold
 * - En stock (IN STOCK): rupture === 0 (or false/"0") AND qte > low_stock_threshold
 */
export function getProductStockStatus(product: ProductLike): ProductStockStatus {
  const qte = Number(product.qte ?? 0);
  const rupture = isRupture(product);
  const isOutOfStock = rupture || qte <= 0;
  const threshold = Number((product as any).low_stock_threshold ?? 0);
  const isLowStock = !isOutOfStock && threshold > 0 && qte <= threshold;

  let stockLabel: ProductStockStatus['stockLabel'] = 'En stock';
  if (isOutOfStock) stockLabel = 'Rupture de stock';
  else if (isLowStock) stockLabel = 'Stock faible';

  return { qte, isOutOfStock, isLowStock, stockLabel };
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
