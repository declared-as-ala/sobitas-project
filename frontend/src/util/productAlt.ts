/**
 * Centralised, honest alt-text builders for product / brand / category images.
 *
 * Goal: replace the bare `designation_fr` alts (which carry no context) with descriptive,
 * lightly geo-qualified alt text that helps Google Images + accessibility WITHOUT keyword-stuffing.
 * We only append the brand (when known) and a single locality token — never a product-type claim
 * that might be false for a given SKU (e.g. a shaker isn't "protéine").
 *
 * An admin-authored alt (`seo.image_alt` / `alt_cover`) always wins when present.
 */

type AltProductLike = {
  designation_fr?: string | null;
  alt_cover?: string | null;
  seo?: { image_alt?: string | null } | null;
  brand?: { designation_fr?: string | null } | null;
  brand_name?: string | null;
} | null | undefined;

const LOCALITY = 'Tunisie';

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Alt text for a product image: "Whey Gold Standard — Optimum Nutrition — Tunisie".
 * Falls back gracefully when brand is unknown: "Whey Gold Standard — Tunisie".
 */
export function buildProductAlt(product: AltProductLike, opts?: { name?: string; locality?: string }): string {
  const explicit = clean(product?.seo?.image_alt) || clean(product?.alt_cover);
  if (explicit) return explicit;

  const name = clean(opts?.name) || clean(product?.designation_fr) || 'Produit';
  const brand = clean(product?.brand?.designation_fr) || clean(product?.brand_name);

  const segments = [name];
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) segments.push(brand);
  segments.push(clean(opts?.locality) || LOCALITY);

  return segments.join(' — ');
}

/**
 * Alt text for a brand logo: "Optimum Nutrition — marque de compléments en Tunisie | SOBITAS".
 */
export function buildBrandAlt(brandName: string | null | undefined, fallbackAlt?: string | null): string {
  const name = clean(brandName) || clean(fallbackAlt);
  if (!name) return 'Logo de marque de compléments — SOBITAS Tunisie';
  return `${name} — marque de compléments alimentaires en Tunisie | SOBITAS`;
}

/**
 * Alt text for a category tile: "Whey protéine — acheter en Tunisie | SOBITAS".
 */
export function buildCategoryAlt(categoryName: string | null | undefined): string {
  const name = clean(categoryName);
  if (!name) return 'Catégorie de compléments — SOBITAS Tunisie';
  return `${name} — acheter en Tunisie | SOBITAS`;
}
