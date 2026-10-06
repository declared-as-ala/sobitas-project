/**
 * Centralised, honest alt-text builders for product / brand / category images.
 *
 * Google Images grew to ~40% of all impressions (05/10/2026: 727 clicks, 34.2K impressions in 28
 * days, 953 of the ranking hosts are product pages). The alt is the strongest on-page signal an
 * image has, so every product image — on the shopper page AND in the crawler view — reads its alt
 * from HERE, and the two renders produce identical strings for the same image.
 *
 * WHAT WAS WRONG: the backend stamped a template into `alt_cover` / `seo.image_alt`:
 * « {designation_fr} — {brand} — Tunisie ». That template
 *  - repeats the brand (11,203 of 11,380 names already contain it): « BIG WHEY 2KG - BIG RAMY LABS
 *    — BIG RAMY LABS — Tunisie »;
 *  - shouts (216 all-caps legacy best sellers);
 *  - keeps mojibake after a rename: « OPTI-WOMEN â€“ 120CAPS — Optimum Nutrition — Tunisie ».
 * The template is recognised (`isGeneratedAlt`) and replaced by the storefront's own humanised
 * heading — the same `humanProductHeading` the H1 and Product.name use — plus one locality token.
 * A genuinely hand-written alt (no template shape) still wins.
 *
 * No product-type or category clause is ever added: « … — sommeil et stress » on a shelf image
 * would read as a health claim the label may not make.
 */
import type { Product } from '@/types';
import { humanProductHeading } from '@/util/productMetaDescription';
import { humanizeBrandName } from '@/util/brandName';

type AltProductLike = {
  designation_fr?: string | null;
  slug?: string | null;
  alt_cover?: string | null;
  seo?: { image_alt?: string | null } | null;
  brand?: { designation_fr?: string | null } | null;
  brand_name?: string | null;
} | null | undefined;

/** Which image of the product an alt describes; each role gets its own suffix. */
export type ProductImageRole = 'main' | 'gallery' | 'label' | 'nutrition' | 'thumb';

export type ProductImageAltOptions = {
  /** Display name override (e.g. a card's already-resolved name). Humanised like designation_fr. */
  name?: string;
  /** Brand name when the product row carries no `brand` relation (listing projections). */
  brand?: string | null;
  role?: ProductImageRole;
  /** 0-based position of the image within its role. */
  index?: number;
  /** Number of images in that role (gallery only). */
  total?: number;
};

/**
 * `productImageAlt` bound to one product: the alt for its image of `role` at 0-based `index` among
 * `total`. The shopper gallery components take this so they never build an alt string themselves.
 */
export type ProductImageAltFor = (role: ProductImageRole, index?: number, total?: number) => string;

const LOCALITY = 'Tunisie';

/**
 * The backend alt template: « … — {brand} — Tunisie » or « … — Tunisie ». A hand-written alt that
 * merely mentions Tunisia (« … – L-glutamine en poudre en Tunisie ») does not match: it has no
 * em-dash-separated « Tunisie » tail.
 */
const GENERATED_ALT = /\s—\s(?:[^—]*\s—\s)?Tunisie\s*$/u;

function clean(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

/** True when the alt is the backend's « name — brand — Tunisie » template, not an admin's words. */
export function isGeneratedAlt(alt?: string | null): boolean {
  const value = clean(alt);
  return value !== '' && GENERATED_ALT.test(value);
}

/**
 * The admin-authored alt (`seo.image_alt`, else `alt_cover` — the backend's own precedence in
 * ProductDetailResource::resolveCoverImageAlt), or '' when it is only the backend template.
 */
function handWrittenAlt(product: AltProductLike): string {
  const explicit = clean(product?.seo?.image_alt) || clean(product?.alt_cover);
  return explicit && !isGeneratedAlt(explicit) ? explicit : '';
}

/**
 * The brand segment of the backend template « {name} — {brand} — Tunisie », or ''. Listing rows
 * (/all_products?light=1, /productsBySubCategoryId) carry `brand_id` and that template but no
 * brand relation; rejecting the template without reading its brand turned « … — Optimum
 * Nutrition — Tunisie » into « 100% Whey Gold Standard – 2,27 kg — Tunisie » on every category
 * grid (06/10/2026). Both renders read the same row, so they still agree.
 */
const TEMPLATE_BRAND = /\s—\s([^—]+?)\s—\sTunisie\s*$/u;
function templateBrand(product: AltProductLike): string {
  const template = clean(product?.seo?.image_alt) || clean(product?.alt_cover);
  return clean(template.match(TEMPLATE_BRAND)?.[1]);
}

/** The humanised product heading — identical to the H1 / Product.name — brand included once. */
function productAltHeading(product: AltProductLike, opts?: { name?: string; brand?: string | null }): string {
  const relationBrand = clean(product?.brand?.designation_fr);
  const looseBrand = clean(opts?.brand) || clean(product?.brand_name) || templateBrand(product);
  const designation = clean(opts?.name) || clean(product?.designation_fr);
  const heading = humanProductHeading({
    designation_fr: designation || undefined,
    slug: clean(product?.slug) || undefined,
    brand: relationBrand
      ? { designation_fr: relationBrand }
      : looseBrand ? { designation_fr: looseBrand } : undefined,
  } as Pick<Product, 'designation_fr' | 'slug' | 'brand'>);
  return clean(heading) || 'Produit';
}

/**
 * One locality token, never two: « King Real Preworkout 500 g Real Pharm Tunisie » already ends
 * with it (the word is in the product name), so it does not get « — Tunisie » again.
 */
function mainAlt(product: AltProductLike, opts: { name?: string; brand?: string | null } | undefined, locality: string): string {
  const written = handWrittenAlt(product);
  if (written) return written;
  const heading = productAltHeading(product, opts);
  // Whole-word test: « Tunisienne » is not « Tunisie ».
  const place = locality.toLocaleLowerCase('fr');
  const hasLocality = heading.toLocaleLowerCase('fr').split(/[^\p{L}\p{N}]+/u).includes(place);
  return hasLocality ? heading : `${heading} — ${locality}`;
}

/**
 * Alt text for one image of a product, by role:
 *  - main       « 100% Whey Gold Standard – 2,27 kg – Optimum Nutrition — Tunisie » (a hand-written
 *                 alt wins over this; the backend template never does);
 *  - gallery    « {heading} — photo 2 sur 5 »;
 *  - label      « {heading} — étiquette 1 »;
 *  - nutrition  « {heading} — valeurs nutritionnelles » (« … 2 sur 3 » when there are several);
 *  - thumb      « {heading} — miniature 3 ».
 */
export function productImageAlt(product: AltProductLike, opts?: ProductImageAltOptions): string {
  const role = opts?.role ?? 'main';
  if (role === 'main') return mainAlt(product, opts, LOCALITY);

  const heading = productAltHeading(product, opts);
  const position = Math.max(0, Math.floor(Number(opts?.index) || 0)) + 1;
  switch (role) {
    case 'gallery': {
      const total = Math.floor(Number(opts?.total) || 0);
      return total >= position ? `${heading} — photo ${position} sur ${total}` : `${heading} — photo ${position}`;
    }
    case 'label':
      return `${heading} — étiquette ${position}`;
    case 'nutrition': {
      const total = Math.floor(Number(opts?.total) || 0);
      return total > 1 && total >= position
        ? `${heading} — valeurs nutritionnelles ${position} sur ${total}`
        : `${heading} — valeurs nutritionnelles`;
    }
    case 'thumb':
      return `${heading} — miniature ${position}`;
    default:
      return mainAlt(product, opts, LOCALITY);
  }
}

/** Bind `productImageAlt` to one product, for the gallery / label-grid components. */
export function productImageAltFor(
  product: AltProductLike,
  opts?: { name?: string; brand?: string | null },
): ProductImageAltFor {
  return (role, index, total) => productImageAlt(product, { ...opts, role, index, total });
}

/**
 * Alt text for a product's main image — `productImageAlt` with the `main` role. Kept under this
 * name for every existing caller (cards, flash deals, crawler listing and product views).
 */
export function buildProductAlt(
  product: AltProductLike,
  opts?: { name?: string; brand?: string | null; locality?: string },
): string {
  return mainAlt(product, opts, clean(opts?.locality) || LOCALITY);
}

/**
 * Alt text for a brand logo: « Logo Optimum Nutrition ». The old « {NAME} — marque de compléments
 * alimentaires en Tunisie | Protein.tn » was the same boilerplate on 584 logos and described none
 * of them. `fallbackAlt` (the brand's own `alt_cover`) is only read when the name is missing, and
 * then only up to its first separator — several of those admin alts describe a different logo.
 */
export function buildBrandAlt(brandName: string | null | undefined, fallbackAlt?: string | null): string {
  const fromFallback = clean(fallbackAlt)
    .split(/\s+[—–|:-]\s+/u)[0]
    .replace(/\b(?:logo|tunisie)\b/giu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const name = clean(humanizeBrandName(clean(brandName) || fromFallback));
  if (!name) return 'Logo de marque — Protein.tn';
  return `Logo ${name}`;
}

/**
 * Alt text for a category tile: "Whey protéine — acheter en Tunisie | SOBITAS".
 */
export function buildCategoryAlt(categoryName: string | null | undefined): string {
  const name = clean(categoryName);
  if (!name) return 'Catégorie de compléments — Protein.tn Tunisie';
  return `${name} — acheter en Tunisie | Protein.tn`;
}
