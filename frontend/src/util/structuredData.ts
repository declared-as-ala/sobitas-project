/**
 * JSON-LD structured data for Google rich results.
 * Use build* functions and inject via <script type="application/ld+json">.
 * In development, use validateStructuredData(schema, type) to log errors and Rich Results Test checklist.
 */

import { getStorageUrl } from '@/services/api';
import { resolveArticleLanguage } from '@/util/articleLanguage';
import { brandNameToSlug } from '@/util/brandSlug';
import { getEffectivePrice, hasValidPromo } from '@/util/productPrice';
import { isInStock, getProductStockStatus } from '@/util/cartStock';
import { generateProductFallbackDescription } from '@/util/productDescriptionFallback';
import { productSourceGallery } from '@/util/productSourceFacts';
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
/**
 * schema.org enum unions. Typing the policy against these turns an invalid term into a
 * BUILD error instead of a silent Search Console "Invalid enum value" warning — this class
 * of typo has now cost us twice: `MerchantReturnFiniteReturnPeriod` (140 products) and
 * `ReturnFeesCustomerPaying` (214 products). Never inline a raw schema.org enum string:
 * add it to the union below so the compiler checks it.
 */
type ReturnPolicyCategoryEnum =
  | 'https://schema.org/MerchantReturnFiniteReturnWindow'
  | 'https://schema.org/MerchantReturnNotPermitted'
  | 'https://schema.org/MerchantReturnUnlimitedWindow'
  | 'https://schema.org/MerchantReturnUnspecified';

type ReturnMethodEnum =
  | 'https://schema.org/ReturnAtKiosk'
  | 'https://schema.org/ReturnByMail'
  | 'https://schema.org/ReturnInStore';

type ReturnFeesEnum =
  | 'https://schema.org/FreeReturn'
  | 'https://schema.org/OriginalShippingFees'
  | 'https://schema.org/RestockingFees'
  | 'https://schema.org/ReturnFeesCustomerResponsibility'
  | 'https://schema.org/ReturnShippingFees';

const DEFAULT_RETURN_POLICY: {
  '@type': 'MerchantReturnPolicy';
  applicableCountry: string;
  returnPolicyCategory: ReturnPolicyCategoryEnum;
  merchantReturnDays: number;
  returnMethod: ReturnMethodEnum;
  returnFees: ReturnFeesEnum;
} = {
  '@type': 'MerchantReturnPolicy',
  applicableCountry: 'TN',
  // MUST be "…FiniteReturnWindow" — "…FiniteReturnPeriod" is NOT a schema.org term. The invalid
  // enum made Google discard the whole policy (GSC: 140 "invalid enum" + 156 "missing
  // hasMerchantReturnPolicy" + the Merchant "products missing a return policy" notice).
  returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
  merchantReturnDays: 7,
  returnMethod: 'https://schema.org/ReturnByMail',
  // "…CustomerResponsibility" is the schema.org term for "customer pays return shipping".
  // "…CustomerPaying" does NOT exist — it triggered GSC "Invalid enum value in field
  // returnFees" on 214 products, costing them merchant-listing features.
  returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
};

/**
 * Google wants a price horizon on every Offer (GSC: "Either validThrough or priceValidUntil
 * should be specified" — 210 products). A promo uses its REAL expiry; everything else gets a
 * rolling one-year horizon. Safe because every PDP is ISR (revalidate 300) and is re-rendered
 * immediately on any price change (SeoNotifier), so this date can never drift into the past —
 * a past priceValidUntil makes Google treat the offer as expired and drop the price entirely.
 */
function defaultPriceValidUntil(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Shipping destination is required by Google alongside shippingRate/deliveryTime. */
const SHIPPING_DESTINATION = { '@type': 'DefinedRegion', addressCountry: 'TN' } as const;

/**
 * OfferShippingDetails — emitted ONLY for a product that is actually in stock.
 *
 * `deliveryTime` asserts handling in 0-1 days and transit in 1-3 days. That is a true statement
 * about a product sitting in the Sousse shop and a false one about a product we do not hold: the
 * catalogue import promotes every product with qte = 0 (catalog.promotion.initial_qte), so without
 * this gate ~20,000 Offers would each carry a delivery commitment for goods that have never been in
 * the country, right next to `availability: OutOfStock` that says so.
 *
 * The trade-off, stated rather than hidden: shippingDetails is a RECOMMENDED field for merchant
 * listings, so out-of-stock products may show "missing field shippingDetails" as a non-critical
 * Search Console warning. That is the correct side to be wrong on — an out-of-stock item is not
 * eligible for a merchant listing anyway, so the field buys nothing, while a shipping promise we
 * cannot keep is a claim about the real world. Everything Google actually requires on the Offer —
 * price, priceCurrency, availability, itemCondition, url, hasMerchantReturnPolicy — stays
 * unconditional.
 */
/**
 * schema.org availability, with BackOrder for the catalogue the shop does not physically hold.
 *
 * Three states, not two. 10,535 of 10,669 published products are imported catalogue entries with
 * qte=0 — they were never in stock and never sold out. Declaring those OutOfStock is both wrong and
 * expensive: OutOfStock forfeits Google merchant-listing and free-product-listing eligibility, while
 * BackOrder ("orderable but not in stock") keeps it.
 *
 * OutOfStock is reserved for `force_out_of_stock`, the owner's explicit "do not sell this" switch.
 * That distinction is the whole point — a blanket BackOrder would advertise as obtainable the one
 * category of product the owner has deliberately marked unobtainable.
 */
function availabilityFor(product: Parameters<typeof getProductStockStatus>[0]): string {
  const status = getProductStockStatus(product);
  if (!status.isOutOfStock) return 'https://schema.org/InStock';
  return status.isBackOrder ? 'https://schema.org/BackOrder' : 'https://schema.org/OutOfStock';
}

function buildShippingDetails(product: Product, price: number): Record<string, unknown> | null {
  if (!isInStock(product)) return null;

  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: price >= 300 ? 0 : 10, currency: 'TND' },
    shippingDestination: SHIPPING_DESTINATION,
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
    },
  };
}

/**
 * The Product `description`, never empty, and never the same sentence 20,000 times.
 *
 * This used to end in one hardcoded literal — "{name} — complément alimentaire authentique
 * disponible en Tunisie chez Protéine Tunisie, livraison rapide partout en Tunisie." — duplicated in
 * both builders. Two problems, and the catalogue import turns both from cosmetic into structural:
 *
 * 1. It is IDENTICAL across every product that lacks a description, differing only by the substituted
 *    name. At 309 products that was a handful of pages. At ~20,000 imported products it is the
 *    single most repeated string on the domain, and "many pages whose text differs only by a
 *    substituted noun" is the literal description of scaled content abuse.
 * 2. It did not match the visible page. The PDP renders generateProductFallbackDescription() in its
 *    Description section, so the structured data described the product one way and the body another.
 *
 * Both are fixed by deriving from the same generator the page renders: the text is attribute-driven
 * (name, brand, subcategory, flavours, price, stock) so it varies with the product, and structured
 * data and visible text now state the same thing. It still asserts nothing we do not hold — every
 * value in it comes from a column.
 *
 * The literal remains as a last resort for the case where even that generator produces nothing,
 * because "Missing field description" must not be reachable.
 */
function factualProductDescription(product: Product): string {
  const generated = stripHtml(generateProductFallbackDescription(product), 500);
  if (generated) return generated;

  return `${product.designation_fr || 'Produit'} — produit référencé chez ${SITE_BRAND_NAME}.`;
}


export type BreadcrumbItem = { name: string; url: string };

/**
 * Normalize a schema.org display name/title: trim and collapse internal whitespace runs.
 * Backend `designation_fr` frequently carries trailing spaces (e.g. "ALL IN ISOLATE - 2.04KG
 * BIG RAMY ") and doubled spaces, which then leak verbatim into the Product rich-result title.
 */
function cleanSchemaName(value: unknown, fallback: string = 'Produit'): string {
  const s = typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  return s || fallback;
}

/**
 * Plain-text sanitizer for ANY string emitted into a JSON-LD
 * <script type="application/ld+json"> block. Strips HTML tags and neutralises
 * angle brackets so a value can never contain `</script>` and break out of the
 * element (stored XSS — e.g. via a user-submitted review). JSON-LD text fields
 * are plain text anyway.
 */
export function jsonLdText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
/**
 * Is there evidence this review came from a real purchase?
 *
 * Mirrors ProductSchemaBuilder::isAttestedPurchase() on the backend — both paths build Product
 * structured data independently, so both must apply the same gate or the crawler view and the
 * human view disagree (a recurring failure mode in this codebase).
 */
export function isAttestedPurchase(review: Review): boolean {
  if (review.verified === 1 || review.verified === true) return true;
  return review.commande_id !== null && review.commande_id !== undefined;
}

function buildAggregateRatingAndReviews(product: Product): { aggregateRating?: object; review?: object[] } {
  const reviewsRaw = product.reviews ?? (product as { avis?: Review[] }).avis ?? [];
  const reviews = (reviewsRaw as Review[]).filter((r) => {
    if (r.publier !== undefined && r.publier !== 1) return false;
    // ATTESTED PURCHASES ONLY. "Published" is not "genuine": a live audit found every sampled
    // product carrying ~200 published reviews with verified = 0 and commande_id = null on every
    // row, drawn from a shared pool — a shoulder-press machine and a lateral pulldown share 72
    // byte-identical comments, and the shoulder press is reviewed with "Vanilla طعمها هايل".
    // Asserting those to Google as AggregateRating is a spam-policy violation that risks a manual
    // action on the whole domain. The site still SHOWS whatever the admin publishes; we simply
    // stop claiming it in structured data without evidence of a real order.
    if (!isAttestedPurchase(r)) return false;
    const star = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : NaN;
    return Number.isFinite(star) && star >= 1 && star <= 5;
  });
  if (reviews.length === 0) {
    // The precomputed `schema.rating_value` / `review_count` fallback that used to live here has
    // been REMOVED, not merely gated.
    //
    // It existed so a list-endpoint payload without a full reviews[] array would still show stars.
    // But it is computed backend-side from the same review rows, so while the seeded backlog
    // exists it reproduces exactly the fabricated aggregate this change is meant to stop — and it
    // would have kept emitting 4.6/203 even after the filter above rejected every review. The
    // frontend and backend also deploy separately, so a gate here that trusts a backend field
    // leaves a window where the old value is still served.
    //
    // Consequence, stated plainly: star ratings disappear from product rich results until genuine
    // verified reviews exist. That is the correct outcome — we cannot attest to the current ones.
    // They return automatically once the post-delivery review flow produces reviews carrying
    // verified = 1 or a commande_id, because those satisfy the filter above.
    return {};
  }

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
      const authorName = jsonLdText((r.user?.name && String(r.user.name).trim()) || 'Client') || 'Client';
      const raw = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : 5;
      const ratingVal = Math.max(1, Math.min(5, raw));
      return {
        '@type': 'Review' as const,
        author: { '@type': 'Person' as const, name: authorName },
        datePublished: r.created_at || undefined,
        reviewRating: { '@type': 'Rating' as const, ratingValue: ratingVal, bestRating: 5, worstRating: 1 },
        // jsonLdText strips HTML/angle-brackets so a review can never contain
        // </script> and break out of the JSON-LD <script> element (stored XSS).
        reviewBody: jsonLdText(String(r.comment)).slice(0, 1000),
      };
    });
  if (reviewSnippets.length > 0) result.review = reviewSnippets;
  return result;
}

export function buildProductJsonLd(product: Product, canonicalUrl: string): object | null {
  /*
   * ── EVERY PHOTOGRAPH WE HOLD, NOT JUST THE COVER (owner, 16/08/2026) ────────────────────────
   *
   * 6,437 products carry 23,293 photographs between them and this schema was declaring ONE.
   *
   * `image` is a REQUIRED field for Product rich results, and Google's own guidance asks for
   * several images per product — different angles, the label, the packaging — because that is what
   * lets a result qualify for the image-rich treatments in Search and in Google Images. Sending one
   * URL when eight exist is the difference between an eligible listing and a minimal one, on
   * roughly ten thousand pages.
   *
   * ORDER MATTERS AND THE COVER STAYS FIRST. Google treats the first entry as the primary image,
   * and the cover is the photograph the shop chose. The gallery follows it, deduplicated — on an
   * imported product the cover IS gallery[0], so without the Set the primary image would be
   * declared twice.
   *
   * WHERE THESE URLS POINT, STATED PLAINLY: the imported photography is referenced on the source
   * CDN rather than mirrored, so these entries leave our domain. That is a real dependency and the
   * owner has taken it knowingly. It is not a new one — `cover` on those same products already
   * points at the same host, so this widens an existing exposure rather than opening one. The host
   * is in `next.config.js images.remotePatterns` and in `config/catalog.php media.external_hosts`;
   * both are required, and dropping either breaks the images site-wide.
   */
  const galleryImages = productSourceGallery(product as Parameters<typeof productSourceGallery>[0]);
  // Main product cover first so Google uses it as primary image in Product rich results.
  const rawImages = [product.schema?.image, product.seo?.image, product.cover, ...galleryImages, (product as { alt_cover?: string }).alt_cover].filter(Boolean) as string[];
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
    ?? availabilityFor(product);
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

  const offersPayload: Record<string, unknown> = {
    '@type': 'Offer',
    url: canonicalUrl,
    priceCurrency: 'TND',
    price: formatSchemaPrice(price),
    availability,
    itemCondition: product.schema?.item_condition || 'https://schema.org/NewCondition',
    seller: { '@type': 'Organization', name: SITE_BRAND_NAME },
    hasMerchantReturnPolicy: DEFAULT_RETURN_POLICY,
  };

  // In-stock only — see buildShippingDetails.
  const shippingDetails = buildShippingDetails(product, price);
  if (shippingDetails) offersPayload.shippingDetails = shippingDetails;

  // On an active promo, the sale price is only valid until the promo expires — tell Google so it
  // doesn't keep showing a stale sale price after the promotion ends.
  const untilRaw = product.schema?.price_valid_until
    ?? product.price_valid_until
    ?? (hasValidPromo(product) ? product.promo_expiration_date : undefined);
  const until = untilRaw != null && String(untilRaw).trim() !== '' ? String(untilRaw).trim().slice(0, 10) : '';
  // Always emit a horizon: the promo's real expiry when there is one, else a rolling year.
  offersPayload.priceValidUntil = until || defaultPriceValidUntil();
  // validFrom: stable date (product creation) — GSC "Missing field validFrom" on promo offers.
  const createdAt = (product as { created_at?: unknown }).created_at;
  const validFrom = typeof createdAt === 'string' ? createdAt.slice(0, 10) : '';
  if (validFrom) offersPayload.validFrom = validFrom;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cleanSchemaName(product.designation_fr),
    // Never empty (GSC "Missing field description") — see factualProductDescription.
    description: description || factualProductDescription(product),
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
  /*
   * ── THE GALLERY BELONGS HERE TOO, AND THIS IS THE BUILDER THAT ACTUALLY RUNS ────────────────
   *
   * `app/(shop)/[slug]/[productSlug]/page.tsx` prefers this function whenever the backend sends a
   * `schema` blob, falling back to `buildProductJsonLd` only when it does not. Every imported
   * product HAS that blob, so adding the gallery to the other builder alone changed nothing for
   * the ~10,000 pages it was meant for. Verified on a local production build before this line
   * existed: `Product JSON-LD image entries: 1` on a product whose API response carries three.
   *
   * The backend's own `schema.image` is a single string — the cover — so it stays FIRST and keeps
   * its meaning as the primary image. The gallery is appended and the whole list deduplicated,
   * because on an imported product the cover is also `gallery[0]`.
   */
  const normalizedImages = [
    ...new Set(
      normalizeJsonLdImages([
        source.image ?? product.schema?.image ?? product.seo?.image ?? product.cover,
        ...productSourceGallery(product as Parameters<typeof productSourceGallery>[0]),
      ].flat())
    ),
  ];
  const sku = (product.schema?.sku || product.sku || product.code_product || product.id)?.toString();
  const availability =
    (typeof product.schema?.availability === 'string' && product.schema.availability) ||
    availabilityFor(product);
  const priceNumber = getSchemaPrice(product);
  const price = formatSchemaPrice(priceNumber);
  /**
   * The brand, or NO brand node at all.
   *
   * This used to fall back to SITE_BRAND_NAME, which made every brandless product declare
   * `brand: { name: "Protéine Tunisie" }` — asserting that the shop manufactures the goods it
   * resells, and inventing a Brand @id URL to go with it. buildProductJsonLd has always omitted the
   * node instead (`brand: … : undefined`), so the two builders disagreed about the same product
   * depending on whether the backend graph happened to be present.
   *
   * `brand` is recommended, not required, for Product rich results. Omitting it costs a recommended
   * field; filling it with the retailer's name states something untrue about who makes the product.
   */
  const realBrand = (product.schema?.brand || product.brand?.designation_fr || '').toString().trim();

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
    hasMerchantReturnPolicy: DEFAULT_RETURN_POLICY,
  };

  // In-stock only — see buildShippingDetails. The `delete` matters as much as the assignment: the
  // backend Offer arrives through `...offersInput` and can carry its own shippingDetails, so simply
  // not setting ours would let the upstream delivery promise survive on an out-of-stock product.
  const sanitizeShipping = buildShippingDetails(product, priceNumber);
  if (sanitizeShipping) offers.shippingDetails = sanitizeShipping;
  else delete offers.shippingDetails;

  // Mirror buildProductJsonLd: on an active promo the sale price expires with the promo.
  const sanitizeUntilRaw = product.schema?.price_valid_until
    ?? product.price_valid_until
    ?? (hasValidPromo(product) ? product.promo_expiration_date : undefined);
  const sanitizeUntil = sanitizeUntilRaw != null && String(sanitizeUntilRaw).trim() !== ''
    ? String(sanitizeUntilRaw).trim().slice(0, 10) : '';
  offers.priceValidUntil = sanitizeUntil || defaultPriceValidUntil();
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
    // image is REQUIRED for Product rich results — last-resort brand banner beats an invalid item.
    image: normalizedImages.length > 0 ? normalizedImages : [`${PRODUCTION_ORIGIN}/og-banner.jpg`],
    description:
      stripHtml(
        product.seo?.description || product.meta_description || product.meta_description_fr || product.description_cover || product.description_fr || '',
        500
      ) ||
      (typeof source.description === 'string' && source.description.trim() ? source.description : '') ||
      // Never empty (GSC "Missing field description") — see factualProductDescription.
      factualProductDescription(product),
    offers,
  };

  if (realBrand) {
    sanitized.brand = {
      '@type': 'Brand',
      /*
       * THE BRAND @id MUST BE THE BRAND PAGE'S REAL URL, AND IT WAS NOT.
       *
       * This was `realBrand.toLowerCase().replace(/\s+/g, '-')`, which collapses spaces and leaves
       * every other character alone. Measured live on 12/08/2026 for "Nature's Way":
       *
       *     emitted   https://protein.tn/nature's-way   -> 404
       *     the page  https://protein.tn/nature-s-way   -> 200
       *
       * An `@id` is an identifier Google resolves and follows; pointing it at a 404 tells Google
       * the brand entity does not exist, on every product of that brand. Apostrophes, ampersands
       * and dots are common in supplement brand names (Nature's Way, Doctor's Best, Nature's
       * Bounty), so this was not one product — it was a whole class of them.
       *
       * brandNameToSlug is the function that ALREADY decides this site's brand URLs: it folds
       * accents, turns every non-alphanumeric run into a single hyphen (so "Nature's Way" becomes
       * "nature-s-way", matching the live page) and applies BRAND_SLUG_OVERRIDES, which exists
       * because `app/api/` shadows the `(shop)/[slug]` route and the brand "API" would otherwise
       * point at a route handler. Deriving the URL a second way here could only ever drift from
       * the router, and did.
       *
       * encodeURIComponent stays as a belt-and-braces guard; the slug it now receives is already
       * URL-safe, so it is a no-op rather than the thing producing %27.
       */
      '@id': `${PRODUCTION_ORIGIN}/${encodeURIComponent(brandNameToSlug(realBrand))}`,
      name: realBrand,
    };
  } else {
    // No brand we can name. Drop whatever `...source` supplied rather than letting the backend's
    // own fallback stand in for one.
    delete sanitized.brand;
  }

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
    /**
     * SOBITAS IS THE LEGAL NAME AND IT BELONGS HERE.
     *
     * The consumer rebrand to Protein.tn was deliberate and stays: `name` is the trading name and
     * every visible surface says Protein.tn. But after that change the string "SOBITAS" appeared in
     * ZERO machine-readable places on the whole site — not a title, not a schema field, nothing —
     * while remaining the single biggest search query the site has (589 clicks on 927 impressions
     * in the last 3 months, 63.5% CTR, average position 2.42).
     *
     * `alternateName` is precisely the field for this: it tells Google that one entity has two
     * names, which is what is actually true. It is entity disambiguation, not a ranking factor, so
     * the honest expectation is a more coherent knowledge panel — NOT a traffic lift on a query
     * already sitting at position 2.4. It is here because a company's other name should be stated
     * somewhere, and right now it is stated nowhere.
     */
    alternateName: ['SOBITAS', 'Sobitas'],
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
    /**
     * ── THE YOUTUBE URL WAS REMOVED BECAUSE IT IS A 404 ────────────────────────────────────
     * Verified with a control: `youtube.com/@Google` returns 200 from here, so the request path
     * works; `youtube.com/@proteinetunisie` returns 404. The footer links a DIFFERENT handle
     * (`@proteine-tunisie`, FooterClient.tsx) and that one is also a 404 — so the site currently
     * asserts two different YouTube channels and neither of them exists.
     *
     * `sameAs` is a corroboration signal: it only does anything when the profile links back. A
     * URL that resolves to nothing corroborates nothing and is a claim about an entity that does
     * not exist, so it comes out.
     *
     * ── THE OTHER THREE ARE LEFT ALONE, DELIBERATELY ───────────────────────────────────────
     * Facebook and Instagram DISAGREE with the footer too (`protein.tn` here vs `proteinetunisie`
     * and `sobitas.proteine.tunisie` there), and one side of each pair is wrong. But neither can
     * be settled from a server: Facebook returns 400 to any non-browser request regardless of
     * whether the page exists, and Instagram returns 200 for profiles that do not. Guessing which
     * handle is real would just move the wrong URL from one file to another.
     *
     * This needs the owner to name the real accounts, and it is written up in the PR. Until then
     * these stay as-is rather than being replaced with a different guess.
     */
    sameAs: [
      'https://www.facebook.com/protein.tn',
      'https://www.instagram.com/protein.tn',
      'https://www.tiktok.com/@protein.tn',
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
    /**
     * Coordinates taken from the store's own Google Business Profile pin, not estimated.
     *
     * These previously read 35.8256 / 10.6369 — measured 1,325 metres from the actual shop. For a
     * local business that gap is the difference between appearing in the map pack for a nearby
     * search and being ranked as a competitor's neighbour.
     *
     * Source of truth: the Maps short link in HeaderClient.tsx resolves to
     *   .../place/PROTÉINE+TUNISIE+–+SOBITAS.../@35.8363493,10.630565,17z/...
     *   !1s0x1302131b30e891b1:0x51dae0f25849b20c
     * and the footer's embed iframe carries the same place id with !3d35.8363715!2d10.6306134
     * (~3 m apart, the same pin). Both references point at ONE listing, so there is no duplicate
     * Google Business Profile despite the two different URL formats.
     */
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 35.8363493,
      longitude: 10.630565,
    },
    // hasMap lets Google tie this markup to that exact profile rather than inferring from the
    // address string, which is what disambiguates a business on a street with several units.
    hasMap: 'https://maps.app.goo.gl/w2ytnYAKSZDmjznh6',
    /**
     * The 24 Tunisian governorates the shop actually delivers to, not just "Tunisia".
     *
     * This is the honest way to signal national local relevance. The tempting alternative —
     * generating /proteine-tunis, /proteine-sfax, /proteine-nabeul … from one template with the
     * city name swapped — is a textbook doorway-page pattern: near-duplicate pages funnelling to
     * the same destination, for a business with a single physical store in Sousse. Google treats
     * that as spam, and having just removed fabricated review markup to avoid a manual action it
     * would be absurd to introduce a different one.
     *
     * /proteine-sousse stays because there IS a shop in Sousse and the page has 759 words of
     * genuinely local content. Any future city page has to earn its place the same way.
     *
     * Source: AramexService::normalizeCity — the canonical governorate list the shipping
     * integration itself uses, so this claim is backed by where orders can actually be sent.
     */
    areaServed: [
      { '@type': 'Country', name: 'Tunisia' },
      ...[
        'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja',
        'Jendouba', 'Le Kef', 'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan',
        'Kasserine', 'Sidi Bouzid', 'Gabès', 'Medenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
      ].map((name) => ({ '@type': 'AdministrativeArea', name })),
    ],
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
    // 'SOBITAS' appended for the reason given on the Organization node: it is the legal name, it
    // is the site's single biggest query, and it was machine-readable nowhere after the rebrand.
    alternateName: ['Protein Tunisie', 'Proteine Tunisie', 'protein.tn', 'SOBITAS'],
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
    // Detected per article, not hard-coded. 31 of the 100 blog posts are written in Arabic and
    // every one of them declared inLanguage "fr-TN", which tells Google to evaluate Arabic prose
    // against French queries. The CMS content_lang column exists for this and is NULL on all of
    // them, so resolveArticleLanguage falls back to script detection; an explicit value still wins.
    inLanguage: resolveArticleLanguage(article as never).code,
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
