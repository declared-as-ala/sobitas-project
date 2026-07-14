/**
 * JSON-LD structured data for Google rich results.
 * Use build* functions and inject via <script type="application/ld+json">.
 * In development, use validateStructuredData(schema, type) to log errors and Rich Results Test checklist.
 */

import { getStorageUrl } from '@/services/api';
import { getEffectivePrice, hasValidPromo } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import type { Product, FAQ, Review } from '@/types';

const RICH_RESULTS_TEST = 'https://search.google.com/test/rich-results';
const PRODUCTION_ORIGIN = 'https://protein.tn';
const SITE_BRAND_NAME = 'Protéine Tunisie';

/**
 * Store-wide return policy, emitted on every product Offer.
 * Google Merchant / Search "return policy" enhancement requires this; gating it behind a
 * per-product backend flag (which is set on 0 products) is what produced the Search Console
 * warning "Your products are missing a return policy". These terms must match the human-readable
 * policy page at /page/politique-de-remboursement.
 */
const DEFAULT_RETURN_POLICY = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'TN',
  // MUST be "…FiniteReturnWindow" — "…FiniteReturnPeriod" is NOT a schema.org term. The invalid
  // enum made Google discard the whole policy (GSC: 140 "invalid enum" + 156 "missing
  // hasMerchantReturnPolicy" + the Merchant "products missing a return policy" notice).
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  returnFees: 'https://schema.org/ReturnFeesCustomerPaying',
} as const;

/** Shipping destination is required by Google alongside shippingRate/deliveryTime. */
const SHIPPING_DESTINATION = { '@type': 'DefinedRegion', addressCountry: 'TN' } as const;


export type BreadcrumbItem = { name: string; url: string };

/**
 * Normalize a schema.org display name/title: trim and collapse internal whitespace runs.
 * Backend `designation_fr` frequently carries trailing spaces (e.g. "ALL IN ISOLATE - 2.04KG
 * BIG RAMY ") and doubled spaces, which then leak verbatim into the Product rich-result title.
 */
function cleanSchemaName(value: unknown, fallback: string = 'Produit'): string {
  const s = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return s || fallback;
}

/** Strip HTML tags for plain-text description (max length). */
function stripHtml(html: string, maxLen: number = 500): string {
  if (!html) return '';
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

/**
 * Normalize price for schema.org: numbers only. Converts comma to dot, strips currency symbols/text/spaces.
 * Returns a number suitable for offers.price, or null if unparseable.
 */
function parsePriceForSchema(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const s = String(value).replace(/,/g, '.').replace(/[^\d.-]/g, '').trim();
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Schema price: effective selling price (promo if active), normalized. Fallback: product.prix then 0. Never null. */
function getSchemaPrice(product: Product): number {
  const effective = getEffectivePrice(product);
  let num = parsePriceForSchema(effective);
  if (num === null) num = parsePriceForSchema((product as { prix?: number }).prix);
  if (num === null) num = 0;
  return num;
}

/** Format price for schema.org: numeric string only (no "DT", no spaces). Google requirement. */
function formatSchemaPrice(price: number): string {
  const n = Math.round(price * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** True if string looks like a storage path (e.g. produits/.../file.webp), not alt text or description. */
function looksLikeImagePath(path: string): boolean {
  const s = path.trim();
  if (!s || s.length > 200) return false;
  if (/\s{2,}/.test(s) || s.includes(' – ') || s.includes(' pour ') || s.includes(' avec ')) return false;
  if (/ à prix | Tunisie | pas cher | prix pas cher /i.test(s)) return false;
  if (!s.includes('/') && !/^produits\//.test(s)) return false;
  return /\.(webp|jpg|jpeg|png|gif|avif)(\?|$)/i.test(s) || /^produits\/\S+\.\w+$/i.test(s);
}

/** Only include URLs that are valid (no unencoded spaces). */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const t = url.trim();
  if (t.length > 500) return false;
  if (/\s/.test(t)) return false;
  return t.startsWith('http://') || t.startsWith('https://');
}

function normalizeProductionUrl(url: string, fallbackPath: string = '/'): string {
  const cleanFallbackPath = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`;

  try {
    const parsed = new URL(url);
    if (/sobitas\.tn$/i.test(parsed.hostname)) {
      return `${PRODUCTION_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return parsed.toString();
  } catch {
    if (url.startsWith('/')) {
      return `${PRODUCTION_ORIGIN}${url}`;
    }

    return `${PRODUCTION_ORIGIN}${cleanFallbackPath}`;
  }
}

function normalizeJsonLdImages(input: unknown): string[] {
  const values = Array.isArray(input) ? input : [input];

  return values
    .map((value) => {
      if (typeof value !== 'string' || !value.trim()) return null;
      const trimmed = value.trim();
      if (/^https?:\/\//i.test(trimmed)) return normalizeProductionUrl(trimmed);
      if (looksLikeImagePath(trimmed)) {
        const storageUrl = getStorageUrl(trimmed);
        return storageUrl && isValidImageUrl(storageUrl) ? normalizeProductionUrl(storageUrl) : null;
      }
      return null;
    })
    .filter((value): value is string => !!value);
}

function sanitizeFaqEntries(
  faqs: Array<{ q?: string; a?: string; question?: string; answer?: string }> | null | undefined
): Array<{ question: string; answer: string }> {
  const list = Array.isArray(faqs) ? faqs : [];

  return list
    .map((item) => ({
      question: (item.q || item.question || '').trim(),
      answer: (item.a || item.answer || '').trim(),
    }))
    .filter((item) => item.question.length > 0 && item.answer.length > 0);
}

/**
 * Builds Product JSON-LD for Google Rich Results (Product snippets).
 * Use buildProductJsonLd(product, canonicalUrl) so offers.url matches rel=canonical.
 * Always includes valid offers with price (normalized), availability, itemCondition.
 * `priceValidUntil` is only set when the API provides a real promo/end date (never a synthetic +1 year).
 * Only adds aggregateRating/review when we have real data; author is always Person type.
 */
export function buildProductSchema(product: Product, baseUrl: string): object | null {
  const base = baseUrl.replace(/\/$/, '');
  const slug = (product.slug || '').trim() || String(product.id);
  // Prefer new SEO-friendly /{sousCategorySlug}/{productSlug} canonical when available.
  const sub =
    (product.sous_categories && product.sous_categories[0]) ||
    product.sous_categorie;
  const canonicalUrl = sub?.slug
    ? `${base}/${sub.slug}/${slug}`
    : `${base}/shop/${slug}`;
  return buildProductJsonLd(product, canonicalUrl);
}

/**
 * Builds Product JSON-LD. Pass canonicalUrl so it matches rel=canonical (one script per product page).
 * Fallback when `json_ld_product` is missing from the API; prefer server-built graph from Laravel.
 */
/**
 * Compute AggregateRating + up to 3 Review snippets from a product's real (published) reviews.
 * Returns {} when there are no valid reviews — we never fabricate ratings. Shared by
 * buildProductJsonLd and sanitizeBackendProductJsonLd so the human PDP and the crawler/bot view
 * carry the same stars (the sanitize path used to silently drop them).
 */
function buildAggregateRatingAndReviews(product: Product): { aggregateRating?: object; review?: object[] } {
  const reviewsRaw = product.reviews ?? (product as { avis?: Review[] }).avis ?? [];
  const reviews = (reviewsRaw as Review[]).filter((r) => {
    if (r.publier !== undefined && r.publier !== 1) return false;
    const star = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : NaN;
    return Number.isFinite(star) && star >= 1 && star <= 5;
  });
  if (reviews.length === 0) return {};

  const sum = reviews.reduce((s, r) => {
    const v = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : 0;
    return s + v;
  }, 0);
  const ratingValue = Math.max(1, Math.min(5, Math.round((sum / reviews.length) * 10) / 10));
  const result: { aggregateRating?: object; review?: object[] } = {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(ratingValue),
      bestRating: 5,
      worstRating: 1,
      reviewCount: reviews.length,
    },
  };
  const reviewSnippets = reviews
    .slice(0, 3)
    .filter((r) => r.comment && String(r.comment).trim())
    .map((r) => {
      const authorName = (r.user?.name && String(r.user.name).trim()) || 'Client';
      const raw = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : 5;
      const ratingVal = Math.max(1, Math.min(5, raw));
      return {
        '@type': 'Review' as const,
        author: { '@type': 'Person' as const, name: authorName },
        datePublished: r.created_at || undefined,
        reviewRating: { '@type': 'Rating' as const, ratingValue: ratingVal, bestRating: 5, worstRating: 1 },
        reviewBody: String(r.comment).trim().slice(0, 1000),
      };
    });
  if (reviewSnippets.length > 0) result.review = reviewSnippets;
  return result;
}

export function buildProductJsonLd(product: Product, canonicalUrl: string): object | null {
  // Main product cover first so Google uses it as primary image in Product rich results.
  const rawImages = [product.schema?.image, product.seo?.image, product.cover, (product as { alt_cover?: string }).alt_cover].filter(Boolean) as string[];
  const imagePaths = rawImages.filter((path) => looksLikeImagePath(path));
  if (imagePaths.length === 0 && product.cover) imagePaths.push(product.cover);
  const imageArray = imagePaths
    .map((path) => getStorageUrl(path))
    .filter((url) => isValidImageUrl(url));
  const dedupedImages = [...new Set(imageArray)];
  // Authoritative Offer price = the effective (promo-aware) selling price, so structured data
  // matches the price the user sees and the sanitizeBackendProductJsonLd path. Fall back to the
  // backend's declared schema.price only when the effective price is unavailable.
  const effectivePrice = getSchemaPrice(product);
  const price = (Number.isFinite(effectivePrice) && effectivePrice > 0)
    ? effectivePrice
    : (parsePriceForSchema(product.schema?.price) ?? effectivePrice);
  const availability =
    product.schema?.availability
    ?? (isInStock(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock');
  const description = stripHtml(
    product.seo?.description || product.seo_description || product.meta_description || product.description_cover || product.description_fr || '',
    500
  );
  const sku = (product.schema?.sku != null && String(product.schema.sku).trim() !== '')
    ? String(product.schema.sku).trim()
    : (product.sku != null && String(product.sku).trim() !== '')
      ? String(product.sku).trim()
      : (product.code_product != null && String(product.code_product).trim() !== '')
        ? String(product.code_product).trim()
    : String(product.id);

  if (!Number.isFinite(price) || price < 0) {
    if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
      console.warn('[structured-data] Product', product.id, 'has no valid price; skipping Product JSON-LD');
    }
    return null;
  }

  const shippingRateValue = price >= 300 ? 0 : 10;
  const offersPayload: Record<string, unknown> = {
    '@type': 'Offer',
    url: canonicalUrl,
    priceCurrency: 'TND',
    price: formatSchemaPrice(price),
    availability,
    itemCondition: product.schema?.item_condition || 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: SITE_BRAND_NAME },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: shippingRateValue, currency: 'TND' },
      shippingDestination: SHIPPING_DESTINATION,
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      },
    },
    hasMerchantReturnPolicy: DEFAULT_RETURN_POLICY,
  };

  // On an active promo, the sale price is only valid until the promo expires — tell Google so it
  // doesn't keep showing a stale sale price after the promotion ends.
  const untilRaw = product.schema?.price_valid_until
    ?? product.price_valid_until
    ?? (hasValidPromo(product) ? product.promo_expiration_date : undefined);
  const until = untilRaw != null && String(untilRaw).trim() !== '' ? String(untilRaw).trim().slice(0, 10) : '';
  if (until) {
    offersPayload.priceValidUntil = until;
  }
  // validFrom: stable date (product creation) — GSC "Missing field validFrom" on promo offers.
  const createdAt = (product as { created_at?: unknown }).created_at;
  const validFrom = typeof createdAt === 'string' ? createdAt.slice(0, 10) : '';
  if (validFrom) offersPayload.validFrom = validFrom;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanSchemaName(product.designation_fr),
    // Never empty (GSC "Missing field description") — factual fallback from real product identity.
    description:
      description ||
      `${product.designation_fr || 'Produit'} — complément alimentaire authentique disponible en Tunisie chez Protéine Tunisie (SOBITAS), livraison rapide partout en Tunisie.`,
    // image is REQUIRED for Product rich results — last-resort brand banner beats an invalid item.
    image: dedupedImages.length > 0 ? dedupedImages : [`${PRODUCTION_ORIGIN}/og-banner.jpg`],
    sku,
    productID: sku,
    brand: (product.schema?.brand || product.brand?.designation_fr)
      ? { '@type': 'Brand', name: product.schema?.brand || product.brand?.designation_fr }
      : undefined,
    offers: offersPayload,
  };

  // Return policy is now emitted unconditionally on the Offer (offersPayload above),
  // so no per-product gating here.

  if (dedupedImages.length > 0) {
    schema.image = dedupedImages;
    schema.associatedMedia = dedupedImages.map((url, index) => ({
      '@type': 'ImageObject',
      '@id': `${canonicalUrl}#image-${index + 1}`,
      url,
      contentUrl: url,
      caption: (product.seo?.image_alt || product.alt_cover || product.designation_fr || 'Produit').trim(),
      inLanguage: 'fr-TN',
    }));
  }

  if (product.gtin?.trim()) {
    schema.gtin = product.gtin.trim();
  }
  if (product.mpn?.trim()) {
    schema.mpn = product.mpn.trim();
  }

  const ratingAndReviews = buildAggregateRatingAndReviews(product);
  if (ratingAndReviews.aggregateRating) schema.aggregateRating = ratingAndReviews.aggregateRating;
  if (ratingAndReviews.review) schema.review = ratingAndReviews.review;

  return schema;
}

/**
 * Normalize backend JSON-LD to production-safe values.
 * Prevents domain and branding leakage from legacy payloads before rendering.
 */

/**
 * Deep-clone `value` while removing every rating/review/return-policy node at ANY depth.
 * The old shallow `...source` spread only deleted TOP-LEVEL aggregateRating/review, so a backend
 * blob nesting them (plural `reviews`, `@graph`, `mainEntity`, review items carrying their own
 * aggregateRating…) leaked a SECOND rating next to our re-derived one — Google's CRITICAL
 * "Review has multiple aggregate ratings". Clean root values are re-added after sanitising.
 */
function deepStripRatingNodes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepStripRatingNodes);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'aggregateRating' || key === 'review' || key === 'reviews' || key === 'hasMerchantReturnPolicy') continue;
    out[key] = deepStripRatingNodes(v);
  }
  return out;
}

export function sanitizeBackendProductJsonLd(product: Product, raw: unknown, canonicalUrl: string): object | null {
  if (!raw || typeof raw !== 'object') return null;

  // Scrub rating/review/policy nodes at all depths BEFORE anything reads/spreads the blob, and
  // drop a root @graph outright — a sanitized Product must be one entity, never a second graph.
  const source = deepStripRatingNodes(raw) as Record<string, unknown>;
  delete source['@graph'];
  const canonical = normalizeProductionUrl(canonicalUrl, `/shop/${product.slug || product.id}`);
  const normalizedImages = normalizeJsonLdImages(source.image ?? product.schema?.image ?? product.seo?.image ?? product.cover);
  const sku = (product.schema?.sku || product.sku || product.code_product || product.id)?.toString();
  const availability =
    (typeof product.schema?.availability === 'string' && product.schema.availability) ||
    (isInStock(product) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock');
  const price = formatSchemaPrice(getSchemaPrice(product));
  const brandName = (product.schema?.brand || product.brand?.designation_fr || SITE_BRAND_NAME).toString();

  const shippingRateValue = getSchemaPrice(product) >= 300 ? 0 : 10;
  const offersInput =
    (source.offers && typeof source.offers === 'object' ? source.offers : null) as Record<string, unknown> | null;
  const offers: Record<string, unknown> = {
    ...(offersInput ?? {}),
    '@type': 'Offer',
    url: canonical,
    priceCurrency: (product.schema?.price_currency || 'TND').toString(),
    price,
    availability,
    itemCondition: product.schema?.item_condition || 'https://schema.org/NewCondition',
    seller: {
      '@type': 'Organization',
      '@id': `${PRODUCTION_ORIGIN}/#organization`,
      name: SITE_BRAND_NAME,
      url: PRODUCTION_ORIGIN,
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: shippingRateValue, currency: 'TND' },
      shippingDestination: SHIPPING_DESTINATION,
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
      },
    },
    hasMerchantReturnPolicy: DEFAULT_RETURN_POLICY,
  };

  // Mirror buildProductJsonLd: on an active promo the sale price expires with the promo.
  const sanitizeUntilRaw = product.schema?.price_valid_until
    ?? product.price_valid_until
    ?? (hasValidPromo(product) ? product.promo_expiration_date : undefined);
  const sanitizeUntil = sanitizeUntilRaw != null && String(sanitizeUntilRaw).trim() !== ''
    ? String(sanitizeUntilRaw).trim().slice(0, 10) : '';
  if (sanitizeUntil) offers.priceValidUntil = sanitizeUntil;
  const sanitizeCreatedAt = (product as { created_at?: unknown }).created_at;
  const sanitizeValidFrom = typeof sanitizeCreatedAt === 'string' ? sanitizeCreatedAt.slice(0, 10) : '';
  if (sanitizeValidFrom) offers.validFrom = sanitizeValidFrom;

  const sanitized: Record<string, unknown> = {
    ...source,
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: cleanSchemaName(product.designation_fr, cleanSchemaName(source.name)),
    url: canonical,
    mainEntityOfPage: canonical,
    sku,
    productID: sku,
    brand: {
      '@type': 'Brand',
      '@id': `${PRODUCTION_ORIGIN}/${encodeURIComponent(brandName.toLowerCase().replace(/\s+/g, '-'))}`,
      name: brandName,
    },
    // image is REQUIRED for Product rich results — last-resort brand banner beats an invalid item.
    image: normalizedImages.length > 0 ? normalizedImages : [`${PRODUCTION_ORIGIN}/og-banner.jpg`],
    description:
      stripHtml(
        product.seo?.description || product.meta_description || product.meta_description_fr || product.description_cover || product.description_fr || '',
        500
      ) ||
      (typeof source.description === 'string' && source.description.trim() ? source.description : '') ||
      // Factual fallback so "Missing field description" can't occur (never an empty string).
      `${product.designation_fr || 'Produit'} — complément alimentaire authentique disponible en Tunisie chez Protéine Tunisie (SOBITAS), livraison rapide partout en Tunisie.`,
    offers,
  };

  if (normalizedImages.length > 0) {
    sanitized.image = normalizedImages;
    sanitized.associatedMedia = normalizedImages.map((url, index) => ({
      '@type': 'ImageObject',
      '@id': `${canonical}#image-${index + 1}`,
      url,
      contentUrl: url,
      caption: (product.seo?.image_alt || product.alt_cover || product.designation_fr || 'Produit').trim(),
      inLanguage: 'fr-TN',
    }));
  }

  if (product.gtin?.trim()) sanitized.gtin = product.gtin.trim();
  if (product.mpn?.trim()) sanitized.mpn = product.mpn.trim();
  // The return policy is emitted (validly) on the Offer above. Remove any PRODUCT-level
  // hasMerchantReturnPolicy that leaked in via `...source` — the backend's copy can carry a
  // stale/invalid returnPolicyCategory, which is what triggers Google's "Invalid enum value
  // in field returnPolicyCategory" warning even though our Offer-level policy is valid.
  delete sanitized.hasMerchantReturnPolicy;

  // Re-derive AggregateRating/Review from the product's real reviews. The backend json_ld_product
  // often omits these even when the PDP shows a visible star rating, so the bot view lost its stars.
  // Delete any backend-provided values first so ours (star-clamped, author-validated) win.
  delete sanitized.aggregateRating;
  delete sanitized.review;
  const ratingAndReviews = buildAggregateRatingAndReviews(product);
  if (ratingAndReviews.aggregateRating) sanitized.aggregateRating = ratingAndReviews.aggregateRating;
  if (ratingAndReviews.review) sanitized.review = ratingAndReviews.review;

  return sanitized;
}

/**
 * BreadcrumbList schema for category and product pages.
 * items[].url can be relative (e.g. /shop) or absolute; baseUrl is used to resolve to absolute.
 */
export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
  baseUrl: string
): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${base}${item.url.startsWith('/') ? item.url : '/' + item.url}`,
    })),
  };
}

/**
 * Parse a store-wide rating aggregate that the OPERATOR supplies (e.g. from Google Business /
 * Facebook / Google Customer Reviews). Returns null unless BOTH a valid average (1–5) and a
 * positive review count are present. We never fabricate a store rating: an unset/invalid value
 * emits no aggregateRating at all (Google forbids self-serving, unsourced business ratings).
 */
export function parseStoreRating(
  ratingValue: unknown,
  ratingCount: unknown
): { ratingValue: number; reviewCount: number } | null {
  const value = typeof ratingValue === 'number' ? ratingValue : parseFloat(String(ratingValue ?? '').replace(',', '.'));
  const count = typeof ratingCount === 'number' ? ratingCount : parseInt(String(ratingCount ?? '').replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(value) || value < 1 || value > 5) return null;
  if (!Number.isFinite(count) || count < 1) return null;
  return { ratingValue: Math.round(value * 10) / 10, reviewCount: Math.floor(count) };
}

/**
 * Organization schema: name, logo, address (Tunisia), contactPoint, sameAs.
 * Use sitewide (e.g. in layout).
 *
 * `options.rating` — optional REAL store rating (see parseStoreRating). When present, an
 * `aggregateRating` is attached to the OnlineStore so Google can show store/seller stars alongside
 * the brand. Only pass genuine, operator-supplied numbers.
 */
export function buildOrganizationSchema(
  baseUrl: string,
  options?: { rating?: { ratingValue: number; reviewCount: number } | null }
): object {
  const base = baseUrl.replace(/\/$/, '');
  const rating = options?.rating ?? null;
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'OnlineStore'],
    '@id': `${base}/#organization`,
    name: SITE_BRAND_NAME,
    url: base,
    logo: `${base}/logo.png`,
    description:
      'Whey protein, créatine, vitamines et compléments alimentaires en Tunisie — livraison rapide et produits authentiques. Boutique à Sousse, livraison dans tout le pays.',
    ...(rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: String(rating.ratingValue),
            reviewCount: rating.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Ribat',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+21627612500',
      email: 'contact@protein.tn',
      contactType: 'customer service',
      areaServed: 'TN',
      availableLanguage: 'French',
    },
    sameAs: [
      'https://www.facebook.com/protein.tn',
      'https://www.instagram.com/protein.tn',
      'https://www.tiktok.com/@protein.tn',
      'https://www.youtube.com/@proteinetunisie',
    ],
  };
}

/**
 * LocalBusiness schema (extends Organization for local SEO).
 */
export function buildLocalBusinessSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${base}/#localbusiness`,
    parentOrganization: { '@id': `${base}/#organization` },
    name: `${SITE_BRAND_NAME} – Protéines & Compléments Alimentaires Tunisie`,
    image: `${base}/icon.png`,
    logo: `${base}/logo.png`,
    url: base,
    telephone: '+21627612500',
    email: 'contact@protein.tn',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rue Ribat',
      addressLocality: 'Sousse',
      postalCode: '4000',
      addressCountry: 'TN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 35.8256,
      longitude: 10.6369,
    },
    areaServed: { '@type': 'Country', name: 'Tunisia' },
    priceRange: '$$',
    currenciesAccepted: 'TND',
    paymentAccepted: 'Cash on delivery, Bank transfer',
    // Must match the visible hours on the Contact page (Lun→Sam 10h–19h30, Dimanche 14h–19h).
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '10:00',
        closes: '19:30',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Sunday',
        opens: '14:00',
        closes: '19:00',
      },
    ],
    sameAs: [
      'https://www.facebook.com/protein.tn',
      'https://www.instagram.com/protein.tn',
    ],
  };
}

/**
 * WebSite schema (sitewide).
 *
 * NOTE: The SearchAction / sitelinks-searchbox block was intentionally REMOVED.
 * (1) Google stopped supporting the sitelinks search box feature in late 2024, so
 *     the markup no longer earns any rich result.
 * (2) Its `urlTemplate` (`/shop?search={search_term_string}`) leaked into Google's
 *     index verbatim as `/shop?search=%7Bsearch_term_string%7D` (visible in Search
 *     Console), plus it legitimised `/shop?search=WHEY%20PROTEIN`-style parameter
 *     URLs as crawlable duplicates. Removing it eliminates the source of that junk.
 */
export function buildWebSiteSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: 'Protéine Tunisie',
    alternateName: ['Protein Tunisie', 'Proteine Tunisie', 'protein.tn'],
    url: base,
    inLanguage: 'fr-TN',
    publisher: { '@id': `${base}/#organization` },
  };
}

/**
 * SiteNavigationElement (as an ItemList) describing the primary navigation + top category hubs.
 * Emitted sitewide so crawlers understand the site's structure and the canonical hub URLs — this
 * reinforces the main ranking targets (protéine / whey / créatine Tunisie) as first-class sections.
 * Every URL must be a real 200 page (verified) so we never advertise a broken/redirecting nav link.
 */
export function buildSiteNavigationSchema(baseUrl: string): object {
  const base = baseUrl.replace(/\/$/, '');
  const links: Array<{ name: string; path: string }> = [
    { name: 'Accueil', path: '/' },
    { name: 'Nos produits', path: '/shop' },
    { name: 'Whey protéine', path: '/whey-proteine' },
    { name: 'Créatine', path: '/creatine' },
    { name: 'Gainers & prise de masse', path: '/gainers-proteines' },
    { name: 'Perte de poids', path: '/perte-de-poids' },
    { name: 'Packs', path: '/packs' },
    { name: 'Marques', path: '/brands' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Navigation principale — Protéine Tunisie',
    itemListElement: links.map((l, index) => ({
      '@type': 'SiteNavigationElement',
      position: index + 1,
      name: l.name,
      url: `${base}${l.path}`,
    })),
  };
}

/**
 * WebPage schema for generic pages (name, description, url).
 */
export function buildWebPageSchema(
  name: string,
  url: string,
  baseUrl: string,
  options?: { description?: string }
): object {
  const base = baseUrl.replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? url : '/' + url}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url: fullUrl,
    description: options?.description || undefined,
    inLanguage: 'fr-TN',
    isPartOf: { '@type': 'WebSite', url: base },
  };
}

/**
 * CollectionPage schema for category listing pages (product grid).
 */
export function buildCollectionPageSchema(
  name: string,
  url: string,
  baseUrl: string,
  options?: { description?: string }
): object {
  const base = baseUrl.replace(/\/$/, '');
  const fullUrl = url.startsWith('http') ? url : `${base}${url.startsWith('/') ? url : '/' + url}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: fullUrl,
    description: options?.description || undefined,
    inLanguage: 'fr-TN',
    isPartOf: { '@type': 'WebSite', url: base },
  };
}

/**
 * ItemList schema for category pages (list of products).
 */
export function buildItemListSchema(
  items: Array<{ name: string; url: string }>,
  baseUrl: string,
  options?: { name?: string; description?: string }
): object {
  const base = baseUrl.replace(/\/$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options?.name || 'Produits',
    description: options?.description || undefined,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: item.url.startsWith('http') ? item.url : `${base}${item.url.startsWith('/') ? item.url : '/' + item.url}`,
    })),
  };
}

/**
 * Article/BlogPosting schema for blog posts (rich results, author, date).
 */
export function buildArticleSchema(article: {
  designation_fr?: string;
  description_fr?: string;
  description?: string;
  cover?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
  seo?: {
    title?: string | null;
    description?: string | null;
    author?: string | null;
    image?: string | null;
  };
  schema?: {
    type?: string;
    section?: string | null;
    headline?: string | null;
    description?: string | null;
    image?: string | null;
    author?: string | null;
    date_published?: string | null;
    date_modified?: string | null;
  };
  categories?: Array<{ name?: string }>;
  tags?: Array<{ name?: string } | string>;
}, baseUrl: string, imageUrl?: string): object {
  const base = baseUrl.replace(/\/$/, '');
  // Encode the slug as a single path segment: some article slugs contain Arabic text/spaces,
  // which must not appear raw in the JSON-LD url/mainEntityOfPage (would be an invalid URL).
  const encodedSlug = article.slug
    ? (() => { try { return encodeURIComponent(decodeURIComponent(article.slug.trim())); } catch { return encodeURIComponent(article.slug.trim()); } })()
    : '';
  const url = encodedSlug ? `${base}/blog/${encodedSlug}` : `${base}/blog`;
  const plainDesc = (article.description_fr || article.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  const headline = article.seo?.title || article.schema?.headline || article.designation_fr || 'Article';
  const description = article.seo?.description || article.schema?.description || plainDesc || undefined;
  const section = article.schema?.section || article.categories?.[0]?.name || undefined;
  const keywords = article.tags
    ?.map((t) => (typeof t === 'string' ? t : t?.name))
    .filter(Boolean)
    .join(', ') || undefined;
  // Guarantee an absolute image (Article rich results are ineligible without one): resolve storage
  // paths, and fall back to the brand logo when the article has no cover.
  const rawSchemaImage = article.seo?.image || article.schema?.image || imageUrl || '';
  const schemaImage = rawSchemaImage
    ? (rawSchemaImage.startsWith('http') ? rawSchemaImage : getStorageUrl(rawSchemaImage))
    : `${base}/logo.png`;
  const published = article.schema?.date_published || article.created_at || undefined;
  const modified = article.schema?.date_modified || article.updated_at || article.created_at || undefined;
  // Author is Organization when it's the brand (the default for every article); Person only for a
  // genuine human byline. A brand name under @type Person is a structured-data smell.
  const rawAuthor = String(article.seo?.author || article.schema?.author || '').trim();
  const author = rawAuthor && rawAuthor !== SITE_BRAND_NAME
    ? { '@type': 'Person', name: rawAuthor }
    : { '@type': 'Organization', name: SITE_BRAND_NAME, '@id': `${base}/#organization` };
  return {
    '@context': 'https://schema.org',
    '@type': article.schema?.type || 'BlogPosting',
    headline,
    description,
    image: schemaImage,
    url,
    datePublished: published,
    dateModified: modified,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    author,
    articleSection: section,
    keywords,
    publisher: { '@type': 'Organization', name: SITE_BRAND_NAME, logo: { '@type': 'ImageObject', url: `${base}/icon.png` } },
    inLanguage: 'fr-TN',
  };
}

/**
 * FAQPage schema. Match visible questions/answers (e.g. from getFAQs() or product FAQs).
 */
export function buildFAQPageSchema(faqs: FAQ[] | unknown): object | null {
  const arr: FAQ[] = Array.isArray(faqs) ? faqs : ((faqs as any)?.data ?? []);
  const list = arr.filter((f) => f.question && f.reponse);
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({
      '@type': 'Question',
      name: (f.question || '').trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (f.reponse || '').trim(),
      },
    })),
  };
}

/** FAQPage schema from product repeater format [{ q, a }] */
export function buildFAQPageSchemaFromProductFaq(
  faqs: Array<{ q?: string; a?: string; question?: string; answer?: string }> | null | undefined
): object | null {
  const normalized = sanitizeFaqEntries(faqs);

  if (!normalized.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: normalized.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

/** FAQPage schema from { question, answer } pairs (e.g. blog SEO config). */
export function buildFAQPageSchemaFromQA(
  faqs: Array<{ question: string; answer: string }>
): object | null {
  const list = faqs.filter((f) => (f.question || '').trim() && (f.answer || '').trim());
  if (!list.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((f) => ({
      '@type': 'Question',
      name: (f.question || '').trim(),
      acceptedAnswer: {
        '@type': 'Answer',
        text: (f.answer || '').trim(),
      },
    })),
  };
}

export type StructuredDataType =
  | 'Product'
  | 'BreadcrumbList'
  | 'Organization'
  | 'FAQPage'
  | 'LocalBusiness'
  | 'WebSite'
  | 'CollectionPage';

/** Required fields per type for Google rich results (simplified checklist). */
const REQUIRED: Record<StructuredDataType, string[]> = {
  Product: ['name', 'image', 'offers', 'offers.price', 'offers.priceCurrency', 'offers.availability', 'offers.url'],
  BreadcrumbList: ['itemListElement'],
  Organization: ['name', 'url'],
  FAQPage: ['mainEntity'],
  LocalBusiness: ['name', 'address'],
  WebSite: ['name', 'url'],
  CollectionPage: ['name', 'url'],
};

/**
 * In development: validate JSON-LD and log a Rich Results Test checklist.
 * Call after building schema, e.g. validateStructuredData(productSchema, 'Product').
 */
/**
 * Returns a short checklist for testing with Google Rich Results Test.
 * Validate Product fix: Google Search Console → URL Inspection → “Validate Fix” after deploying.
 */
export function getRichResultsChecklist(): string[] {
  return [
    `1. Open ${RICH_RESULTS_TEST}`,
    '2. Enter your product page URL (e.g. https://protein.tn/shop/one-a-day-biotech-usa) and run the test',
    '3. Product: expect Product with offers (price, availability, itemCondition); optional AggregateRating/Review only if we have real data',
    '4. Category listing: BreadcrumbList + CollectionPage (+ ItemList when products render); FAQPage when FAQs are on-page',
    '5. Sitewide: Organization, LocalBusiness, WebSite',
    '6. FAQ page / product with FAQs: expect FAQPage',
    '7. Search Console: after fix is live, use “Validate Fix” for the “Extraits de produits” issue',
  ];
}

export function validateStructuredData(
  schema: object,
  type: StructuredDataType
): void {
  if (process.env.NODE_ENV !== 'development' || typeof window !== 'undefined') {
    return;
  }
  const s = schema as Record<string, unknown>;
  const errors: string[] = [];

  if (type === 'Product') {
    if (!s.name) errors.push('Product: missing name');
    if (!s.image) errors.push('Product: missing image');
    const offers = s.offers as Record<string, unknown> | undefined;
    if (!offers) errors.push('Product: missing offers');
    else {
      if (offers.price === undefined || offers.price === null) errors.push('Product.offers: missing price');
      if (!offers.priceCurrency) errors.push('Product.offers: missing priceCurrency');
      if (!offers.availability) errors.push('Product.offers: missing availability');
      if (!offers.url) errors.push('Product.offers: missing url');
    }
  } else if (type === 'BreadcrumbList') {
    const list = s.itemListElement as unknown[] | undefined;
    if (!Array.isArray(list) || list.length === 0) errors.push('BreadcrumbList: missing or empty itemListElement');
  } else if (type === 'Organization') {
    if (!s.name) errors.push('Organization: missing name');
    if (!s.url) errors.push('Organization: missing url');
  } else if (type === 'FAQPage') {
    const main = s.mainEntity as unknown[] | undefined;
    if (!Array.isArray(main) || main.length === 0) errors.push('FAQPage: missing or empty mainEntity');
  } else if (type === 'LocalBusiness') {
    if (!s.name) errors.push('LocalBusiness: missing name');
    if (!s.address) errors.push('LocalBusiness: missing address');
  } else if (type === 'WebSite') {
    if (!s.name) errors.push('WebSite: missing name');
    if (!s.url) errors.push('WebSite: missing url');
  } else if (type === 'CollectionPage') {
    if (!s.name) errors.push('CollectionPage: missing name');
    if (!s.url) errors.push('CollectionPage: missing url');
  }

  if (errors.length > 0) {
    console.warn('[structured-data]', type, 'validation issues:', errors);
  }
  console.info(
    `[structured-data] Rich Results Test: ${RICH_RESULTS_TEST} — Test your page URL to verify ${type} eligibility.`
  );
}
