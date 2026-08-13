/**
 * Stock validation for cart (frontend only).
 * API semantics: rupture === true | 1 | "1" = out of stock; qte <= 0 = out of stock.
 * qte = source of truth for quantity; rupture = explicit out-of-stock flag (can be boolean or 0/1).
 */

/** Minimal product shape for stock. API may return rupture as number (0/1) or boolean. */
export interface ProductLike {
  id: number;
  qte?: number;
  quantityInStock?: number;
  availableStock?: number;
  rupture?: number | boolean;
  force_out_of_stock?: number | boolean;
  low_stock_threshold?: number;
}

export interface CartItemLike {
  product: ProductLike;
  quantity: number;
}

/** True when API says "out of stock": the hard force_out_of_stock override, or rupture === true/1/"1". */
export function isRupture(product: ProductLike): boolean {
  const f = (product as any).force_out_of_stock;
  if (f === true || f === 1 || f === '1') return true;
  const r = (product as any).rupture;
  return r === true || r === 1 || r === '1';
}

/**
 * Does this payload carry ANY stock information at all?
 *
 * Some list endpoints used to select none of the stock columns, so the object simply had no idea
 * whether the product was available. That is a THIRD state, and pretending otherwise is what made
 * the grid and the product page contradict each other: isInStock() answered "yes" for a payload
 * with no data, while getProductStockStatus() answered "out of stock" for the same payload — the
 * two defaults failed in opposite directions. Now the absence is named, and callers decide
 * explicitly rather than inheriting whichever guess their helper happened to make.
 */
export function hasStockData(product: ProductLike): boolean {
  return (
    product.qte != null ||
    (product as ProductLike & { rupture?: unknown }).rupture != null ||
    (product as ProductLike & { force_out_of_stock?: unknown }).force_out_of_stock != null
  );
}

/**
 * Whether the product is in stock. Thin wrapper over getProductStockStatus so there is exactly
 * one implementation of "is this available" in the app — see the note there.
 */
export function isInStock(product: ProductLike): boolean {
  return !getProductStockStatus(product).isOutOfStock;
}

/**
 * Stock disponible pour un produit. Returns 0 when rupture is true.
 * If no quantity info is available, returns 1 to allow adding to cart.
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
  return 1; // No quantity info available, assume in stock (rupture flag is authoritative)
}

export interface ProductStockStatus {
  qte: number;
  isOutOfStock: boolean;
  /**
   * Not held, but obtainable on request — "Sur commande".
   *
   * ── WHY THIS IS A SEPARATE FLAG AND NOT A THIRD VALUE OF isOutOfStock ────────────────────
   * Measured on the live catalogue, 13/08/2026:
   *
   *     134     qte>0,  rupture=false, force_out_of_stock=false   real inventory
   *     10,535  qte=0,  rupture=true,  force_out_of_stock=false   the imported iHerb catalogue
   *
   * 98.7% of the shop is a catalogue the business does not physically hold. Labelling all of it
   * "Rupture de stock" is both discouraging and inaccurate — these were never in stock and never
   * sold out; they are items that can be brought in. It also costs Google merchant-listing
   * eligibility, which OutOfStock forfeits and BackOrder does not.
   *
   * `isOutOfStock` STAYS TRUE for these. That is the entire safety design: every add-to-cart guard,
   * quantity check and cart validation in the app already keys off isOutOfStock, and flipping it
   * would have made 10,535 products addable to the basket in one edit — real orders for goods
   * nobody has. The owner's decision was request-only, so this flag changes what a shopper is TOLD
   * and OFFERED, never what the cart accepts.
   *
   * `force_out_of_stock` is the discriminator, and it is the right one: it is the owner's explicit
   * "do not sell this" switch, currently false on every row in the catalogue. When they set it, they
   * mean it, and it keeps saying "Rupture de stock".
   */
  isBackOrder: boolean;
  isLowStock: boolean;
  /** True when the payload carried no stock fields — the answer is genuinely unknown. */
  isUnknown: boolean;
  stockLabel: 'Rupture de stock' | 'Sur commande' | 'Stock faible' | 'En stock';
}

/**
 * SINGLE SOURCE OF TRUTH for availability, everywhere: product cards, the detail page, the cart,
 * the quick-order drawer. Every surface must call this, so a product cannot read "En stock" in a
 * grid and "Rupture de stock" on its own page — which it did, on most of the catalogue.
 *
 *   - Rupture de stock : force_out_of_stock, or rupture, or a known qte <= 0
 *   - Stock faible     : in stock AND qte <= low_stock_threshold (threshold 0 disables the label)
 *   - En stock         : otherwise
 *
 * WHY qte IS TESTED FOR PRESENCE, NOT COERCED. This used to read `Number(product.qte ?? 0)`, so a
 * payload with no qte scored 0 and was declared out of stock. Combined with the old isInStock(),
 * which declared the very same payload IN stock, the grid and the detail page disagreed by
 * construction. Missing data is now `isUnknown` and asserts nothing; callers hide the badge rather
 * than invent an answer. The API sends all four stock columns on every list endpoint now, so this
 * should not arise — it exists so that if a future endpoint drops them again, the symptom is a
 * missing badge rather than a confidently wrong one.
 */
export function getProductStockStatus(product: ProductLike): ProductStockStatus {
  const isUnknown = !hasStockData(product);
  const qte = Number(product.qte ?? 0);
  const rupture = isRupture(product);

  // Only let qte drive "out of stock" when we actually received it.
  const isOutOfStock = rupture || (product.qte != null && qte <= 0);

  const threshold = Number((product as ProductLike & { low_stock_threshold?: number }).low_stock_threshold ?? 0);
  const isLowStock = !isOutOfStock && !isUnknown && product.qte != null && threshold > 0 && qte <= threshold;

  // Unavailable, but not because the owner said so — see ProductStockStatus.isBackOrder.
  // `isUnknown` is excluded deliberately: a payload with no stock columns must not be advertised as
  // orderable-on-request any more than it is advertised as in stock.
  const forced = (product as any).force_out_of_stock;
  const isForced = forced === true || forced === 1 || forced === '1';
  const isBackOrder = isOutOfStock && !isForced && !isUnknown;

  let stockLabel: ProductStockStatus['stockLabel'] = 'En stock';
  if (isBackOrder) stockLabel = 'Sur commande';
  else if (isOutOfStock) stockLabel = 'Rupture de stock';
  else if (isLowStock) stockLabel = 'Stock faible';

  return { qte, isOutOfStock, isBackOrder, isLowStock, isUnknown, stockLabel };
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
