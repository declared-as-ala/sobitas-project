/**
 * GA4 `items[]` entries, built from the same product data the storefront renders.
 *
 * Kept apart from `./ga4` so the click path never pays for the item builders: the cart context, the
 * checkout and the quick-order drawer load this module with a dynamic `import()` when an event is
 * actually sent.
 *
 * `item_name` is the catalogue designation with its whitespace squished and capped at 100
 * characters — byte for byte what the backend's Measurement Protocol send uses
 * (Ga4MeasurementProtocol::item(), `Str::squish` + `mb_substr(…, 0, 100)`). One product must carry
 * ONE name in GA4: when the browser sent the humanised H1 and the server the raw designation, every
 * ad-blocked purchase split the product into two rows of "Items purchased". Never "Produit 506":
 * the backend sends a line item's product under `product`, not `produit`, which is how every item
 * name in GA4 became a placeholder.
 */
import { getEffectivePrice } from '@/util/productPrice';
import type { Ga4Item } from './ga4';

/** Structural: the API `Product`, the cart's legacy product and `QuickOrderProduct` all fit. */
export type GaProductLike = {
  id: number;
  slug?: string | null;
  designation_fr?: string | null;
  prix?: number | null;
  promo?: number | null;
  promo_expiration_date?: string | null;
  brand?: { designation_fr?: string | null } | null;
  sous_categorie?: {
    designation_fr?: string | null;
    slug?: string | null;
    categorie?: { designation_fr?: string | null } | null;
  } | null;
  /** Legacy cart product (`@/data/products`): a name and a price instead of designation_fr / prix. */
  name?: string | null;
  price?: number | null;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function finiteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** GA4 drops parameter values past 100 characters; the backend caps the same way (code points). */
const MAX_PARAM_LENGTH = 100;

function capped(value: string): string {
  const chars = Array.from(value);
  return chars.length > MAX_PARAM_LENGTH ? chars.slice(0, MAX_PARAM_LENGTH).join('') : value;
}

/** The backend's rule: designation, else slug, else id (`rawName` and `slug` are already squished). */
function itemName(rawName: string, slug: string, id: string): string {
  return capped(rawName || slug) || id;
}

function effectivePrice(product: GaProductLike): number {
  try {
    return finiteNumber(getEffectivePrice({
      prix: finiteNumber(product.prix),
      price: finiteNumber(product.price) ?? null,
      promo: finiteNumber(product.promo) ?? null,
      promo_expiration_date: product.promo_expiration_date ?? null,
    })) ?? 0;
  } catch {
    return 0;
  }
}

function buildItem(fields: {
  id: string;
  name: string;
  brand: string;
  category: string;
  category2: string;
  variant: string;
  price: number;
  quantity: number;
}): Ga4Item {
  const item: Ga4Item = {
    item_id: fields.id,
    item_name: fields.name,
    price: fields.price,
    quantity: fields.quantity,
  };
  if (fields.brand) item.item_brand = fields.brand;
  if (fields.category) item.item_category = fields.category;
  if (fields.category2) item.item_category2 = fields.category2;
  if (fields.variant) item.item_variant = fields.variant;
  return item;
}

function positiveQuantity(value: unknown): number {
  const n = finiteNumber(value);
  return n !== undefined && n > 0 ? Math.round(n) : 1;
}

/** One GA4 item for a product card, the product page, the cart or the quick-order drawer. */
export function gaItemFromProduct(
  product: GaProductLike,
  opts: { quantity: number; price?: number; variant?: string },
): Ga4Item {
  const id = String(product.id);
  const brand = text(product.brand?.designation_fr);
  const price = typeof opts.price === 'number' && Number.isFinite(opts.price) ? opts.price : effectivePrice(product);
  return buildItem({
    id,
    name: itemName(text(product.designation_fr) || text(product.name), text(product.slug), id),
    brand,
    category: text(product.sous_categorie?.categorie?.designation_fr),
    category2: text(product.sous_categorie?.designation_fr),
    variant: text(opts.variant),
    price,
    quantity: positiveQuantity(opts.quantity),
  });
}

/**
 * One GA4 item for an order line from `GET /commande/{id}` (`details_facture[]`).
 *
 * The line's product arrives as `product` (the Eloquent relation's name) and older code expected
 * `produit`; both are read. The price is the line's own `prix_unitaire` (what this order charged),
 * the quantity `qte`, the variant `arome`. The backend selects only id/designation/cover/prices,
 * so brand and category come from `cartFallback` — the cart line the customer ordered from.
 */
export function gaItemFromOrderDetail(detail: unknown, cartFallback?: GaProductLike | null): Ga4Item {
  const line = (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  const product = ((line.produit ?? line.product) || null) as GaProductLike | null;
  const fallback = cartFallback ?? null;

  const rawId = finiteNumber(product?.id) ?? finiteNumber(line.produit_id) ?? finiteNumber(fallback?.id);
  const id = rawId !== undefined ? String(rawId) : '';
  const brand = text(product?.brand?.designation_fr) || text(fallback?.brand?.designation_fr);
  const rawName = text(product?.designation_fr) || text(fallback?.designation_fr) || text(fallback?.name);
  const slug = text(product?.slug) || text(fallback?.slug);
  const linePrice = finiteNumber(line.prix_unitaire);
  const price = linePrice ?? (product ? effectivePrice(product) : fallback ? effectivePrice(fallback) : 0);

  return buildItem({
    id,
    name: itemName(rawName, slug, id),
    brand,
    category: text(product?.sous_categorie?.categorie?.designation_fr) || text(fallback?.sous_categorie?.categorie?.designation_fr),
    category2: text(product?.sous_categorie?.designation_fr) || text(fallback?.sous_categorie?.designation_fr),
    variant: text(line.arome),
    price,
    quantity: positiveQuantity(line.qte),
  });
}
