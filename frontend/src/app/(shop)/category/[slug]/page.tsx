import { categoryAnchor } from '@/util/categoryAnchor';
import { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { htmlToText, truncateAtWord } from '@/util/sanitizeProductHtml';
import { notFound, permanentRedirect, unstable_rethrow } from 'next/navigation';
import { getErrorStatus } from '@/util/errorStatus';
import { getCategories, getInStockCount, getShopFacets } from '@/services/api';
// Request-scoped cache: generateMetadata and the page body below both need this category, and
// two separate calls could fail independently (metadata 429 + body OK = 200, generic title,
// no canonical — the exact shell measured under crawl load).
import {
  getCachedCategoryOrSubCategoryMetadata as fetchCategoryOrSubCategory,
  getCachedAllBrands,
} from '@/services/getCachedProductDetails';
import type { Brand } from '@/types';
import { resolveCanonicalUrl } from '@/util/canonical';
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildProductSchema,
  buildFAQPageSchemaFromQA,
  validateStructuredData,
} from '@/util/structuredData';
import { getCategorySeoContent } from '@/util/categorySeoContent';
import { mergeCategorySeoForSlug, type CategorySeoFromApi, type MergedCategorySeo, canonicalCategoryPath } from '@/util/resolveCategorySeo';
import { getTunisiaKeywordsForCategory, generateTunisiaMetaTitle, generateTunisiaMetaDescription, generateTunisiaH1 } from '@/util/tunisiaCategoryKeywords';
import { getProductLink, getProductPrimarySubCategory, urlSlug } from '@/util/productUrl';
import { generateCategoryIntroFallback } from '@/util/categoryIntroFallback';
import { getEffectivePrice } from '@/util/productPrice';
// ONE definition of availability for the whole app. The robots gate below reads the same helper
// the product card, the PDP, the cart and the JSON-LD availability read — see the note there.
import { isInStock, type ProductLike } from '@/util/cartStock';
import { CategorySeoLanding, COMPARISON_SLUGS } from '@/app/(shop)/category/CategorySeoLanding';
import { ShopPageClient } from '@/app/(shop)/shop/ShopPageClient';
import { ProductsSkeleton } from '@/app/components/ProductsSkeleton';
import { Suspense } from 'react';
import type { Category, SubCategory } from '@/types';
import { getShopPage } from '@/services/api';
import { loadForCache } from '@/util/loadForCache';
import {
  parseShopQuery,
  buildShopUrl,
  EMPTY_SHOP_QUERY,
  SHOP_PER_PAGE,
  type RawSearchParams,
  type ShopQuery,
} from '@/util/shopQuery';

/**
 * One page of a listing, scoped by the path rather than by the query string.
 *
 * `scope` is applied on top of the parsed query and is NOT written back into the URL — a
 * subcategory page is /whey-isolate?page=2, never /whey-isolate?subcategory=whey-isolate&page=2.
 * Two URLs for one page is the duplicate-content problem this migration exists to reduce.
 *
 * loadForCache stays on the OUTSIDE for the reason it always has: a transient upstream failure must
 * render empty without that emptiness being baked into the ISR entry for the next ten minutes.
 */
export async function loadListingPage(query: ShopQuery, scope: Partial<ShopQuery>) {
  const scoped: ShopQuery = { ...query, ...scope };

  /*
   * ── unstable_cache IS WHAT PAYS FOR THIS ROUTE GOING DYNAMIC ──────────────────────────────
   *
   * Reading searchParams costs /[slug] its generateStaticParams and therefore its Full Route
   * Cache (see the long note at the foot of that file). Without a data cache that would mean one
   * API call per visitor on the listing pages — and, far more importantly, no protection when the
   * origin is unwell. The API has been observed answering 504 on every endpoint; a cached page
   * rides through that, a naively dynamic one serves an empty category.
   *
   * Keyed on the fully-scoped query, so /proteines, /proteines?page=2 and /whey-isolate are three
   * entries rather than one wrong one. 600s to mirror the ISR window this replaces.
   *
   * loadForCache stays OUTSIDE, for the reason it always does: it turns a throw into an empty
   * render, and inside the cache that empty render is what would be stored for the next ten
   * minutes. Outside, the throw propagates, unstable_cache stores nothing, and the previous good
   * page keeps being served.
   */
  const cached = unstable_cache(
    () => getShopPage(scoped, SHOP_PER_PAGE),
    ['listing-page', buildShopUrl(scoped, scope.subcategories?.[0] ?? scope.categories?.[0] ?? 'shop')],
    { revalidate: 600, tags: ['shop', 'products'] }
  );

  const res = await loadForCache(
    cached,
    { products: [], brands: [], categories: [] } as Awaited<ReturnType<typeof getShopPage>>
  );

  const total = res.pagination?.total ?? res.products.length;
  const totalPages = Math.max(1, res.pagination?.last_page ?? 1);

  return {
    productsData: { products: res.products, brands: res.brands, categories: res.categories },
    serverPagination: {
      total,
      totalPages,
      // Clamp: ?page=99999 must not render an empty grid and claim to be page 99999.
      currentPage: Math.min(Math.max(1, res.pagination?.current_page ?? query.page), totalPages),
      perPage: SHOP_PER_PAGE,
    },
  };
}

export type PageProps = {
  params: Promise<{ slug: string }>;
  /**
   * Optional because /x-crawler/category/[slug] delegates here without one. Reading it is what
   * makes ?page=N work; a route that ignores it renders page 1 for every page number.
   */
  searchParams?: Promise<RawSearchParams>;
};

/**
 * ── WHY THIS ROUTE NOW PAGINATES, AND WHY THAT IS THE BIGGEST SEO CHANGE IN THE FILE ──────────
 *
 * Measured live on 14/08/2026, before this change:
 *
 *     /sante-vitalite        8,849 products in the category, 12 product links on the page, 0 ?page= links
 *     /proteines               561 products,                 13 links,                      0 ?page= links
 *     /probiotiques             (subcategory)                12 links,                      0 ?page= links
 *     /sante-vitalite?page=2   200 OK, and a byte-for-byte DUPLICATE of page 1
 *
 * Six category pages and fifty subcategory pages, each exposing twelve products. So the ONLY crawl
 * path to the 10,669th product was /shop?page=1 through ?page=890 — one 890-link chain that Google
 * walks slowly, shallowly and last. That is the structural reason the deep catalogue is not indexed,
 * and no amount of per-product content fixes it.
 *
 * Paginating here turns that one 890-page chain into fifty-six short ones, each topically coherent:
 * /whey-isolate?page=3 is a page about whey isolate, which is both a better crawl path and a better
 * ranking target than the same twelve products buried at /shop?page=417.
 *
 * The machinery already existed — ShopPageClient's server mode, shopQuery, the pager's real hrefs —
 * and its own docblock predicted this exact gap: "the other four surfaces would be left showing 12
 * products each, which is precisely the failure this migration exists to fix, moved rather than
 * removed." This is that job finished.
 */

// ISR (see app/[slug]/page.tsx): cacheable category HTML for better Core Web Vitals.
export const revalidate = 600;

/** Legacy/wrong slugs → canonical slug (from API). Ensures correct API response and SEO. */
const slugAliases: Record<string, string> = {
  'bandages-de-soutien-musculaire': 'bandes-de-soutien-musculaire',
};

/**
 * Canonical form of a listing slug: alias-resolved and LOWERCASED.
 *
 * URLs are case-sensitive to a crawler, and nothing here normalised case — so /whey-proteine,
 * /Whey-Proteine and /WHEY-PROTEINE all returned 200 with byte-identical content and, worse, each
 * declared ITSELF as canonical. That is three indexable duplicates of every listing and CMS page,
 * generated by any miscapitalised inbound link. Verified live before this change:
 *   /whey-proteine  -> canonical https://protein.tn/whey-proteine
 *   /Whey-Proteine  -> canonical https://protein.tn/Whey-Proteine
 *   /WHEY-PROTEINE  -> canonical https://protein.tn/WHEY-PROTEINE
 *
 * Lowercasing the canonical collapses every case variant onto one URL without needing a redirect,
 * and it is safe here because slug lookups already resolve case-insensitively — /intra-workout and
 * /Intra-Workout both return 200 with the same H1, even though the stored slug is "Intra-Workout".
 * That stored capitalisation is also why one uppercase URL was shipping in the sitemap; the
 * sitemap now emits the lowercase form too.
 */
function getCanonicalSlug(slug: string): string {
  const aliased = slugAliases[slug] ?? slug;
  return aliased.toLowerCase();
}

/** Resolve category/subcategory slugs to links (name + url). */
function resolveRelatedCategories(
  slugs: string[],
  categories: Category[]
): Array<{ slug: string; name: string; url: string }> {
  const out: Array<{ slug: string; name: string; url: string }> = [];
  for (const s of slugs.slice(0, 6)) {
    const cat = categories.find((c) => c.slug === s);
    if (cat) {
      out.push({ slug: cat.slug, name: categoryAnchor(cat.slug, cat.designation_fr), url: canonicalCategoryPath(cat.slug) });
      continue;
    }
    for (const c of categories) {
      const sub = (c.sous_categories || []).find((sc: SubCategory) => sc.slug === s);
      if (sub) {
        out.push({ slug: sub.slug, name: categoryAnchor(sub.slug, sub.designation_fr), url: canonicalCategoryPath(sub.slug) });
        break;
      }
    }
  }
  return out;
}

/** Resolve product slugs to links from a product list. */
function resolveBestProducts(
  slugs: string[],
  products: Array<{ slug?: string; designation_fr?: string; sous_categorie?: { slug?: string }; sous_categories?: Array<{ slug?: string }> }>
): Array<{ slug: string; name: string; url: string }> {
  const bySlug = new Map(products.map((p) => [p.slug ?? '', p]));
  return slugs.slice(0, 6).reduce<Array<{ slug: string; name: string; url: string }>>((acc, s) => {
    const p = bySlug.get(s);
    if (p) {
      // Use new SEO-friendly URL format if subcategory exists
      const subCategory = p.sous_categories?.[0] || p.sous_categorie;
      const url = subCategory?.slug ? `/${urlSlug(subCategory.slug)}/${s}` : null;
      acc.push({ slug: s, name: p.designation_fr ?? s, url: url || `/${s}` });
    }
    return acc;
  }, []);
}

/**
 * Derive REAL intro-fallback inputs (product count, most common brands, min price) from the
 * product list already available to the page. Used only to fill an empty intro — never fabricated.
 */
function deriveIntroDataFromProducts(
  products: Array<{ brand?: { designation_fr?: string }; prix?: number; promo?: number; promo_expiration_date?: string }>
): { productCount: number; topBrands: string[]; priceMin: number | null } {
  const list = Array.isArray(products) ? products : [];
  const brandFreq = new Map<string, number>();
  let priceMin: number | null = null;
  for (const p of list) {
    const bname = p.brand?.designation_fr?.trim();
    if (bname) brandFreq.set(bname, (brandFreq.get(bname) || 0) + 1);
    const price = getEffectivePrice(p as any);
    if (typeof price === 'number' && price > 0) {
      priceMin = priceMin === null ? price : Math.min(priceMin, price);
    }
  }
  const topBrands = [...brandFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([n]) => n)
    .slice(0, 3);
  return { productCount: list.length, topBrands, priceMin };
}

/** CTR-optimized meta title: 55–65 chars, keyword + Tunisia + brand. */
const META_TITLE_MAX_LEN = 65;

/**
 * Search Console exposed high-impression, low-click query clusters whose reviewed copy lives
 * in `content/categories/*.json`. Filament also contains older metadata for those same categories,
 * and the normal API-first merge kept silently replacing the reviewed title, description and H1
 * in production. Keep the global admin-first policy; only these measured, explicitly curated
 * opportunities take their checked-in copy as the source of truth.
 */

/**
 * Shared listing furniture for every category page.
 *
 * These values describe the catalogue rather than one 24-product page, so deriving them in the
 * browser is both inaccurate and expensive. The cache keys intentionally match /shop: warming one
 * surface warms the other, and a category navigation does not add three origin requests to TTFB.
 */
async function loadCategoryListingSupport() {
  const cachedFacets = unstable_cache(() => getShopFacets(), ['shop-facets'], {
    revalidate: 600,
    tags: ['shop', 'products'],
  });
  const cachedCategories = unstable_cache(() => getCategories(), ['shop-categories'], {
    revalidate: 3600,
    tags: ['categories'],
  });
  const cachedInStockCount = unstable_cache(() => getInStockCount(), ['shop-in-stock-count'], {
    revalidate: 300,
    tags: ['shop', 'products'],
  });

  const [facets, categories, inStockCount] = await Promise.all([
    cachedFacets(),
    cachedCategories().catch((error) => {
      console.error('Error fetching categories:', error);
      return [] as Awaited<ReturnType<typeof getCategories>>;
    }),
    cachedInStockCount(),
  ]);

  // The filter UI reads only these fields. Keeping media/SEO/admin timestamps out of the RSC
  // payload saves roughly 13 KB before compression on every category navigation.
  const categoriesForClient = categories.map((category) => ({
    id: category.id,
    slug: category.slug,
    designation_fr: category.designation_fr,
    sous_categories: (category.sous_categories ?? []).map((subCategory) => ({
      id: subCategory.id,
      slug: subCategory.slug,
      designation_fr: subCategory.designation_fr,
    })),
  }));

  // Brands and subcategories are not consumed from facets by ShopPageClient. Do not serialize a
  // second copy of those lists; keep only the authoritative ranges and count maps.
  const facetsForClient = { ...facets, brands: [], subcategories: [] };

  return { categories, categoriesForClient, facets: facetsForClient, inStockCount };
}

function toMetaTitle(seoH1: string | undefined, fallbackName: string | undefined, slug?: string): string {
  if (seoH1?.trim()) {
    const trimmed = seoH1.trim();
    if (trimmed.length <= META_TITLE_MAX_LEN) return trimmed;
    const cut = trimmed.slice(0, META_TITLE_MAX_LEN - 1);
    const lastSpace = cut.lastIndexOf(' ');
    return lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  }
  if (fallbackName && slug) {
    const tunisiaKeywords = getTunisiaKeywordsForCategory(slug);
    if (tunisiaKeywords) {
      return generateTunisiaMetaTitle(fallbackName, tunisiaKeywords);
    }
    return `${fallbackName} | Protéine Tunisie`;
  }
  return fallbackName ? `${fallbackName} | Proteine Tunisie` : 'Catégorie | Proteine Tunisie';
}

function metaKeywordsList(merged: MergedCategorySeo): string[] | undefined {
  const raw = merged.metaKeywords?.trim();
  if (!raw) return undefined;
  const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? [...new Set(parts)] : undefined;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = getCanonicalSlug(slug?.trim() ?? '');
  const metaQuery = parseShopQuery(searchParams ? await searchParams : undefined);
  try {
    const { type, data } = await fetchCategoryOrSubCategory(canonicalSlug);
    const apiTitle =
      type === 'subcategory'
        ? (data as any).sous_category?.designation_fr
        : (data as any).category?.designation_fr;
    const apiSeo = (data as any).seo as CategorySeoFromApi | undefined;
    const seoJson = await getCategorySeoContent(canonicalSlug);
    const merged = mergeCategorySeoForSlug(canonicalSlug, seoJson, apiSeo);
    /*
     * ── THE EMPTY-SUBCATEGORY COUNT CANNOT COME FROM THIS PAYLOAD ─────────────────────────────
     * It used to: `(data as any).pagination?.total ?? (data as any).products?.length`. The guard
     * around it was written for a payload whose shape might change, and reasoned that `undefined`
     * must read as "indexable" because a wrong noindex across 50 subcategories is the expensive
     * direction to fail in. That reasoning was right and the implementation still failed, because
     * `fetchCategoryOrSubCategory` calls the taxonomy endpoint with `?meta_only=1`, which answers
     * `products: []` and no pagination BY DESIGN. An empty array is present, so the `undefined`
     * escape never fired and every subcategory counted zero.
     *
     * Measured on production 22/09/2026 before the fix: /accessoires served `noindex, follow` with
     * 15 products on the page, /proteines-multi-sources with 24, /enfants with 24, /cardio-fitness
     * with 8. The only thing saving /creatine and the rest was the `seoJson !== null` clause — a
     * curated content file — so indexability was tracking which categories someone had written copy
     * for, not which ones had anything to sell. /accessoires holds dip-belt, 42 clicks in 90 days.
     *
     * The real count is `serverPagination.total` from the listing the page is about to render
     * anyway, so the decision moves below, next to the stock gate that already reads it.
     */
    const hasEditorialGuide = seoJson !== null;
    let metaTitle =
      merged.metaTitle && merged.metaTitle.length <= META_TITLE_MAX_LEN
        ? merged.metaTitle
        : toMetaTitle(merged.h1, apiTitle, canonicalSlug);
    /**
     * THE BRAND SUFFIX MUST NOT COST MORE THAN IT ADDS.
     *
     * ` | Protéine Tunisie` carries two signals: the brand, and the country. The old rule appended
     * it whenever the title did not literally contain "protéine"/"protein.tn", and made room by
     * trimming the title. On a catalogue whose titles are all ALREADY geo-qualified, that traded
     * real words for a word the title had said once already. Measured across 30 live category
     * pages on 17/08/2026, 13 were damaged by it:
     *
     *     Mass Gainer Tunisie | Serious Mass & Prise de | Protéine Tunisie
     *                                                ^^ "Masse" trimmed to fit a duplicate
     *     Collagène en Tunisie | Protéine Tunisie          ZMA en Tunisie | Protéine Tunisie
     *
     * The CMS title for the first is `Mass Gainer Tunisie | Serious Mass & Prise de Masse` — 51
     * characters, comfortably inside the 65 limit, and correct. It was cut to 45 to bolt on a
     * suffix that repeated "Tunisie" and left the title ending on a preposition.
     *
     * So the suffix is now chosen by what the title is MISSING:
     *   names the brand already        -> add nothing
     *   names the country but not us   -> add the short brand mark, and only if it fits as-is
     *   names neither                  -> the old behaviour, trimming to make room, which is
     *                                     the one case where the trade is worth making
     *
     * Titles ending `— Protein.tn` were always fine; that is the house style this converges on.
     */
    const brand = ' | Protéine Tunisie';
    const shortBrand = ' — Protein.tn';
    const namesBrand = /protéine|proteine|protein\.tn/i.test(metaTitle);
    const namesCountry = /tunisie|tunisia/i.test(metaTitle);

    if (namesBrand) {
      // Nothing to add. Fall through to the length clamp below.
    } else if (namesCountry) {
      // Never trim a valid title for this one — if it does not fit, the geo signal is already
      // there and the brand mark is the part worth dropping.
      if (metaTitle.length + shortBrand.length <= META_TITLE_MAX_LEN) {
        metaTitle = metaTitle + shortBrand;
      }
    } else {
      // Trim the BASE title on a word boundary BEFORE appending the full brand suffix,
      // so the brand (and "Tunisie") is never chopped mid-word. Previously
      // `(metaTitle + brand).slice(0, MAX)` could mangle the suffix to "…Protéine Tuni".
      const maxBase = META_TITLE_MAX_LEN - brand.length;
      if (metaTitle.length > maxBase) {
        const cut = metaTitle.slice(0, maxBase);
        const lastSpace = cut.lastIndexOf(' ');
        metaTitle = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim();
      }
      metaTitle = metaTitle + brand;
    }
    if (metaTitle.length > META_TITLE_MAX_LEN) {
      const cut = metaTitle.slice(0, META_TITLE_MAX_LEN - 1);
      const lastSpace = cut.lastIndexOf(' ');
      metaTitle = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
    }
    /*
     * ── PAGE N GETS ITS OWN TITLE. /shop HAS DONE THIS SINCE IT PAGINATED ─────────────────────
     *
     * Measured live 22/09/2026 as Googlebot: /creatine and /creatine?page=2 shipped the SAME
     * <title> ("Créatine Monohydrate Tunisie | Prix & Achat | Protein.tn") and the same H1, on ten
     * pages of the series; /shop?page=2 already reads "… — Page 2 | Protein.tn" (`suffix` in
     * shop/page.tsx). Two URLs with one title is the duplicate signal, and it is the half of it
     * that can be fixed from here — the repeated landing copy lives in the crawler view.
     *
     * Appended AFTER the length clamp, not before: clamping a suffixed title chops the suffix off
     * again, which is the one part of the string that has to survive. A page-N title running a few
     * characters past the SERP budget costs nothing — these URLs are not ranking targets, they are
     * a crawl path, and uniqueness is the only job the title has here.
     *
     * Page 1 is untouched, byte for byte, on every category including the frozen ones.
     */
    if (metaQuery.page > 1) {
      metaTitle = `${metaTitle} — Page ${metaQuery.page}`;
    }
    const tunisiaKeywords = getTunisiaKeywordsForCategory(canonicalSlug);
    // A CMS description only wins if it is long enough to BE a description.
    //
    // This checked the maximum (<= 500) and nothing else, so "Whey protein tunisie" — 20
    // characters, the entire meta description on /whey-proteine — beat the generated fallback and
    // shipped as the page's snippet. Google gives roughly 155 characters of SERP real estate;
    // spending 20 of them on a repeat of the title throws away the one piece of copy that decides
    // whether a searcher clicks. Several sibling categories had the same stub.
    //
    // 70 is deliberately forgiving: it rejects title-echo stubs while leaving any genuinely
    // written short description intact. Below it, fall through to the category intro, then to the
    // Tunisia-specific generator — both of which say something a buyer can act on.
    const CMS_DESCRIPTION_MIN_LEN = 70;
    const cmsDescription = merged.metaDescription?.trim() ?? '';
    const description =
      cmsDescription.length >= CMS_DESCRIPTION_MIN_LEN && cmsDescription.length <= 500
        ? cmsDescription
        : // htmlToText, not a hand-rolled tag strip: the intro is CMS HTML, so "&amp;" has to be
          // DECODED here. Stripping tags alone left the entity in the text, which then got escaped
          // again on its way into the attribute and reached Google as a literal "&amp;amp;".
          (htmlToText(merged.intro, 160) ||
            generateTunisiaMetaDescription(apiTitle || canonicalSlug, tunisiaKeywords));
    // merged.canonicalUrl is sous_categories.canonical_url / categs.canonical_url — free text.
    // forceProteinDomain only normalised the HOST, so it accepted '/musculation' verbatim even
    // though the admin redirect table 301s /musculation straight back to this page. The guard
    // catches that and falls back to the (always-live) self canonical.
    /*
     * ── PAGE N SELF-CANONICALISES; PAGE 1 KEEPS THE ADMIN OVERRIDE ─────────────────────────
     *
     * Since Google retired rel=prev/next, its guidance is that a paginated page points at itself.
     * /sante-vitalite?page=7 holds twelve products that appear on no other URL, so canonicalising
     * it to /sante-vitalite tells Google those twelve do not exist — and with 8,849 products in
     * that one category, that is the difference between a crawl path to the deep catalogue and no
     * path at all.
     *
     * `merged.canonicalUrl` is an admin override and is honoured on page 1 only: an override
     * pointing every page of a series at one URL is the mistake described above, spelled out by
     * hand.
     */
    /*
     * ── ?page BEYOND THE LAST PAGE CANONICALISES TO THE LAST REAL PAGE ────────────────────────
     *
     * Measured live 22/09/2026 as Googlebot: /creatine?page=99999 answered HTTP 200, 128 KB, zero
     * product links, and `<link rel="canonical" href="https://protein.tn/creatine?page=99999">` —
     * a soft 404 that asserts a URL which does not exist, on every one of 55 listings. /shop
     * closed the identical hole in its own generateMetadata (read the ?page=N-beyond-the-end note
     * there for why the head has to do the work the status line cannot on this route).
     *
     * The fetch is the SAME `unstable_cache` entry the page body is about to read, keyed
     * identically by `loadListingPage`, so this is a cache lookup rather than a second round trip,
     * and it only runs when page > 1.
     *
     * `total > 0` IS THE OUTAGE GUARD AND IS NOT OPTIONAL: `loadForCache` turns a 429 or a 5xx
     * into an empty response whose `last_page` falls back to 1. Without the guard, every real
     * paginated listing on the site would canonicalise to page 1 for the length of the incident —
     * a far more expensive mistake than the one being fixed.
     */
    const listingScope: Partial<ShopQuery> =
      type === 'subcategory'
        ? { subcategories: [canonicalSlug], categories: [] }
        : { categories: [canonicalSlug], subcategories: [] };
    let overflowedTo: number | null = null;
    /*
     * ── A LISTING WHERE NOTHING ON THE PAGE CAN BE BOUGHT IS noindex, follow ──────────────────
     *
     * Measured live 22/09/2026 (browser UA, production). Each product card renders its
     * `stockLabel` once, so the label census below is a direct read of getProductStockStatus on
     * the very payload this route serves:
     *
     *     /cla /probiotiques /digestion /immunite /sommeil-stress /plantes-et-herbes
     *     /glucides-energie                24 products shown, 24 "Sur commande",  0 in stock
     *     /intra-workout                   24 products shown, 24 "Sur commande",  0 in stock
     *     /post-workout                    18 products shown, 18 "Sur commande",  0 in stock
     *     /creatine                        24 shown, 8 "En stock", 16 "Sur commande"
     *     /mass-gainers                    7 "En stock", 9 "Sur commande"
     *
     * Nine full pages of 24 tiles where every single add-to-cart is refused. Google has already
     * priced them: in the 28-day Search Console export, seven of the nine do not appear in
     * Pages.csv at all, and the two that do are /cla (1 click, 2 impressions) and
     * /glucides-energie (1 click, 1 impression). Over three months it is /cla 2 clicks,
     * /post-workout 1, /glucides-energie 1, /intra-workout 0 clicks on 14 impressions. Roughly
     * one click a month across the whole set, against 1,255 URLs already sitting in
     * crawled-currently-not-indexed. Keeping them indexed spends crawl budget to rank a page
     * whose entire job — selling something — it cannot do.
     *
     * WHY noindex AND NOT 410 OR 301. Stock comes back. A 410 destroys the URL and the products'
     * breadcrumb parent permanently; a 301 tells Google the concept does not exist. `noindex,
     * follow` is the only directive that reverses itself: the day one product in the category is
     * back in stock, the next render emits `index, follow` again with no intervention and no
     * deploy. Same self-correcting shape as the empty-subcategory rule above and the empty-brand
     * rule in the crawler route.
     *
     * `follow` IS THE POINT, not a detail. These nine categories are the crawl path to several
     * hundred product pages, and an out-of-stock PRODUCT stays fully indexable with
     * availability BackOrder/OutOfStock — that is Google's own guidance and those PDPs hold the
     * long tail (/plantes-et-herbes/… alone took 20 clicks on 184 impressions in 28 days while
     * its parent category took none). Nothing here touches a product.
     *
     * THREE CONSTRAINTS, EACH OF WHICH HAD TO BE WRITTEN DOWN:
     *
     * 1. PAGE 1 ONLY. A deep page of a big category running out of stock says nothing about the
     *    category — /sante-vitalite?page=300 is 24 back-order items out of 8,849 and its parent
     *    is perfectly healthy. Only the page a searcher actually lands on gets a vote, so the
     *    test is scoped to `page === 1` and page 2+ keeps the unconditional `index, follow` the
     *    note below argues for.
     *
     * 2. AN API OUTAGE MUST NOT NOINDEX THE SITE. `loadForCache` deliberately converts a 429 or
     *    a 5xx into an empty result so the render is not cached — which means "zero products"
     *    and "the origin is down" arrive here as the same object. `serverPagination.total > 0`
     *    is the existing discriminator (see the overflow note above, where it stops an outage
     *    collapsing every paginated listing onto page 1) and it is reused verbatim, with
     *    `shown.length > 0` beside it. During an incident `total` is 0, the condition is false,
     *    and every category on the site stays indexable. Failing that way round is not optional:
     *    a wrong noindex applied to all 55 listings at once is unrecoverable for weeks, a wrong
     *    index on an empty page costs one crawl.
     *
     * 3. ONE DEFINITION OF "IN STOCK", NOT A SECOND ONE. `isInStock` is a thin wrapper over
     *    getProductStockStatus — the same helper the card, the PDP, the cart and the
     *    availability in the JSON-LD all read. Re-deriving it from `qte`/`rupture` here is how
     *    this class of bug starts: a page that says noindex while the grid it renders says
     *    "En stock". It also inherits the right default for free — a payload carrying NO stock
     *    columns is `isUnknown`, which reads as in stock, so if a future endpoint drops those
     *    fields the symptom is that this gate stops firing rather than that it fires on
     *    everything.
     *
     * Both views are covered by one edit: /x-crawler/category/[slug] delegates its entire
     * metadata to this function for category and subcategory slugs, so a bot and a shopper
     * cannot be told different things about the same URL.
     */
    let nothingBuyableHere = false;
    // `undefined` = not established (page 2+, or an outage). Never treated as empty.
    let publishedTotal: number | undefined;
    if (metaQuery.page > 1) {
      const { serverPagination } = await loadListingPage(metaQuery, listingScope);
      if (serverPagination.total > 0 && metaQuery.page > serverPagination.totalPages) {
        overflowedTo = serverPagination.totalPages;
      }
    } else {
      // Same `unstable_cache` entry the page body is about to read, keyed identically by
      // `loadListingPage` — a cache lookup, not a second round trip.
      const { productsData, serverPagination } = await loadListingPage(metaQuery, listingScope);
      const shown = (productsData.products ?? []) as ProductLike[];
      publishedTotal = serverPagination.total;
      nothingBuyableHere =
        serverPagination.total > 0 && shown.length > 0 && shown.every((p) => !isInStock(p));
    }
    /*
     * A subcategory is noindex only when the listing itself reports zero published products AND no
     * editorial guide stands in for them. `loadListingPage` turns a 429/5xx into an empty result,
     * so an outage would read as zero — which is why page 2+ and any page that never established a
     * total leave `publishedTotal` undefined and the page indexable. Failing that way round is not
     * optional: the alternative is noindexing every listing on the site during an incident.
     */
    const indexable =
      type !== 'subcategory' ||
      hasEditorialGuide ||
      publishedTotal === undefined ||
      publishedTotal > 0;
    const canonicalUrl = metaQuery.page > 1
      ? await resolveCanonicalUrl(undefined, buildShopUrl({ ...EMPTY_SHOP_QUERY, page: overflowedTo ?? metaQuery.page }, `/${encodeURIComponent(canonicalSlug)}`))
      : await resolveCanonicalUrl(merged.canonicalUrl, `/${encodeURIComponent(canonicalSlug)}`);
    /* truncateAtWord, not slice: a blunt cut produced "…ongles et peau. Livra" on
       /beaute-cheveux — mid-word, no ellipsis, live in the SERP. The helper backs off to a
       sentence, then a clause, then a word boundary, and drops a dangling function word. */
    // Page N carries a `Page N — ` prefix for the same reason the title does: one description
    // across ten URLs is a duplicate signal. Budget kept at ~155 by trimming the body first.
    const descTrimmed = metaQuery.page > 1
      ? `Page ${metaQuery.page} — ${truncateAtWord(description, 140)}`
      : truncateAtWord(description, 155);
    const ogImageRaw = merged.ogImage || undefined;
    const ogImage = ogImageRaw && /^https?:\/\//i.test(ogImageRaw) && !/\s/.test(ogImageRaw) ? ogImageRaw : undefined;
    const ogAlt = (apiSeo?.og?.image_alt as string | undefined)?.trim() || merged.h1 || apiTitle || 'Catégorie';
    const ogTitleMeta = (merged.ogTitle ?? '').trim() || metaTitle;
    const ogDescMeta = (merged.ogDescription ?? '').trim() || descTrimmed;
    const twitterTitleMeta = (merged.twitterTitle ?? '').trim() || ogTitleMeta;
    const twitterDescMeta = (merged.twitterDescription ?? '').trim() || ogDescMeta;
    const twitterImgRaw = (merged.twitterImage ?? '').trim() || ogImageRaw;
    const twitterImg = twitterImgRaw && /^https?:\/\//i.test(twitterImgRaw) && !/\s/.test(twitterImgRaw) ? twitterImgRaw : undefined;
    const kw = metaKeywordsList(merged);
    const fallbackKeywords = tunisiaKeywords ? [tunisiaKeywords.primary, ...tunisiaKeywords.variations] : [];
    const allKeywords = kw ? [...kw, ...fallbackKeywords] : (fallbackKeywords.length > 0 ? fallbackKeywords : undefined);
    return {
      title: { absolute: metaTitle },
      description: descTrimmed,
      ...(allKeywords ? { keywords: allKeywords } : {}),
      alternates: { canonical: canonicalUrl },
      /*
       * ── EVERY PAGE OF THE SERIES IS INDEXABLE UNLESS IT HAS NOTHING TO SELL ─────────────────
       * The first clause still says what it always said: a resolved category or subcategory is
       * indexable no matter what the admin's own robots flag claims, because a live listing
       * accidentally flagged noindex in Filament is how ranking surfaces disappear.
       *
       * The one exemption is the EMPTY SUBCATEGORY, and it exists so that this page and the
       * sitemap stop disagreeing about the same URL. util/sitemapSources.ts:663-664 already drops
       * a subcategory with no published product and no content file ("a listing page with zero
       * products is a heading, a breadcrumb, and nothing to buy … soft 404"), while this route
       * kept serving it `index, follow` — measured 22/09/2026, /vetements: HTTP 200, index/follow,
       * "Aucun produit disponible pour le moment", 0 occurrences in /sitemaps/listings.xml, and
       * linked from the nav on every page. The brand branch of the crawler route has implemented
       * exactly this rule since it was written (x-crawler/category/[slug]/page.tsx:149,
       * `index: brandProductCount > 0`). Self-correcting, like both of them: the day the
       * subcategory gets its first product it is indexable again with no intervention.
       *
       * The count comes from the taxonomy payload already fetched above, NOT from
       * loadListingPage — that helper converts a transient 429/5xx into an empty product list, and
       * a wrong noindex on a healthy listing costs far more than a wrong index on an empty one.
       * `fetchCategoryOrSubCategory` throws on a transient error instead, and the catch below
       * rethrows it.
       *
       * Scoped to subcategories only, mirroring the sitemap rule: a top-level category with no
       * products of its own still lists its subcategories and is not a dead end.
       *
       * ── ?page=2+ NO LONGER CARRIES noindex. THIS CLAUSE WAS REMOVED ON PURPOSE ──────────────
       *
       * The `metaQuery.page > 1` clause that used to sit in front of `!indexable` argued that a
       * paged listing is a near-duplicate of page 1 and should be kept out of the index while
       * staying crawlable. Two things make that the wrong trade on this site.
       *
       * 1. `noindex, follow` DOES NOT STAY `follow`. Google has been explicit that a long-lived
       *    noindex on a URL degrades in practice to `noindex, nofollow`: once a page stops being
       *    indexed it stops being recrawled often, and the links on it stop being followed. The
       *    directive that was chosen *because* it kept the crawl path open is the one that closes
       *    it after a few months. /sante-vitalite holds 8,849 products and shows 24 a page;
       *    ?page=2…N is the ONLY internal path to the other 8,825 — this route gave up
       *    `generateStaticParams` specifically so that path could exist (see app/[slug]/page.tsx).
       *    Strangling it is the most expensive thing this file can do.
       *
       * 2. THE DUPLICATE IT WAS DEFENDING AGAINST IS BEING REMOVED IN THIS SAME COMMIT. The
       *    "~310 words of shared furniture" the old note cited — intro, buying guide, long-bottom,
       *    FAQ and the FAQPage JSON-LD — no longer render on page > 1: the crawler view drops them
       *    in x-crawler/category/[slug]/page.tsx and the human view drops them below via
       *    `isPaged`. Page N's title now ends "— Page N", its description starts "Page N — ", and
       *    it self-canonicalises. What is left on the URL is 24 product tiles that appear nowhere
       *    else. That is not a duplicate of page 1; it is the rest of the catalogue.
       *
       * Google's own pagination guidance since rel=prev/next was retired in 2019 is exactly this
       * shape: each page self-canonical, each page indexable, no rel=prev/next (none is emitted
       * here or anywhere else). Indexable does not mean it will rank — Google is free to fold a
       * thin page N out of the SERP on its own — but it keeps the page crawled, which is the only
       * property the deep catalogue actually needs.
       *
       * The empty-subcategory rule above is unchanged, and it is now joined by exactly one other
       * reason this route emits noindex — the zero-stock gate documented beside
       * `nothingBuyableHere`. Both say the same thing in different words: a listing with nothing
       * to sell. The first means no products exist; the second means 24 exist and not one of
       * them can be added to a basket. Neither is a page number rule; page 2+ of a healthy
       * category stays `index, follow`.
       *
       * This is read by BOTH views: /{slug} delegates its metadata here, and so does
       * /x-crawler/category/[slug] — the route middleware rewrites Googlebot to. One edit, no
       * drift between what a shopper and a crawler are told.
       */
      robots: !indexable || nothingBuyableHere
        ? { index: false, follow: true }
        : { index: true, follow: true },
      openGraph: {
        title: ogTitleMeta,
        description: ogDescMeta.slice(0, 200),
        url: canonicalUrl,
        ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630, alt: ogAlt }] }),
      },
      twitter: {
        card: 'summary_large_image',
        title: twitterTitleMeta,
        description: twitterDescMeta.slice(0, 200),
        ...(twitterImg && { images: [twitterImg] }),
      },
    };
  } catch (e) {
    unstable_rethrow(e);
    // Genuine 404: the page body's own resolution calls notFound() and Next serves a real 404.
    // Describe it as noindex so the interim shell can never be indexed on the way there.
    if (getErrorStatus(e) === 404) {
      return {
        title: 'Catégorie introuvable | Proteine Tunisie',
        robots: { index: false, follow: false },
      };
    }
    // TRANSIENT (429 from the shared per-IP bucket, 5xx, timeout). This catch is THE
    // degraded-render bug: /{slug} AND /x-crawler/category/{slug} both delegate their metadata
    // here, so one throttled call emitted HTTP 200 with the generic title
    // "Catégorie | Proteine Tunisie" and NO canonical, while the page body — a SEPARATE API
    // call — rendered the real product grid. Googlebot indexed a duplicate, canonical-less page.
    // Rethrow instead: Next answers with a 5xx it never caches and the crawler simply retries.
    throw e;
  }
}


/**
 * Brand lookup for the comparison table, fetched ONLY for the slugs that mount it.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────────────
 * The table needs brand NAMES; the listing payload carries `brand_id` and nothing else. The obvious
 * source, `sub.brands` / `cat.brands`, is empty on this route and always will be: this page awaits
 * `getCachedCategoryOrSubCategoryMetadata`, which calls the taxonomy endpoints with `?meta_only=1`,
 * and that payload answers `brands: []` and `products: []` by design. Measured live 22/09/2026:
 * GET /api/productsBySubCategoryId/creatine?meta_only=1 -> keys {sous_category, seo, breadcrumb,
 * products, brands, sous_categories}, brands 0, products 0.
 *
 * The crawler route reads `data.brands` off the FULL payload (getCachedCategoryOrSubCategory, no
 * meta_only) and so had a populated list. Passing the empty one here therefore did not merely make
 * the table miss — it made it render for Googlebot and for nobody else, on the one page in this
 * cluster that has to rank. That is the cloaking shape the gate was written to prevent, so the gate
 * did its job and stayed shut; this is the missing input, not a loosened condition.
 *
 * ── WHY IT IS GATED ON THE SLUG ─────────────────────────────────────────────────────────────────
 * getAllBrands is a 566-row fetch. Calling it on all ~50 category renders to serve one table would
 * be a real cost for no gain, so it is awaited only when the slug actually mounts the table. It is
 * request-deduped by React `cache()`, so metadata and body share the one call.
 */
async function comparisonBrands(slug: string): Promise<Brand[]> {
  if (!COMPARISON_SLUGS.has(slug)) return [];
  try {
    return await getCachedAllBrands();
  } catch {
    // A brand-list outage must cost the table, never the page: the gate sees [] and stays shut.
    return [];
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const listingQuery = parseShopQuery(searchParams ? await searchParams : undefined);
  const cleanSlug = slug?.trim();
  if (!cleanSlug) notFound();

  const canonicalSlug = getCanonicalSlug(cleanSlug);
  if (canonicalSlug !== cleanSlug) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[category] Slug alias: "${cleanSlug}" → "${canonicalSlug}"`);
    }
    permanentRedirect(`/${encodeURIComponent(canonicalSlug)}`);
  }

  // Start taxonomy/facets while the route resolves. Once the type is known, the scoped product
  // request starts immediately and waits beside this promise rather than behind it.
  const listingSupportPromise = loadCategoryListingSupport();
  const categoryPromise = fetchCategoryOrSubCategory(canonicalSlug);

  try {
    const { type, data } = await categoryPromise;

    if (type === 'subcategory') {
      const sub = data as {
        sous_category: any;
        products: any[];
        brands: any[];
        sous_categories: any[];
        pagination?: any;
      };
      /*
       * The products come from a PAGINATED call rather than from `sub.products`.
       *
       * fetchCategoryOrSubCategory returns a fixed first page and is still what supplies the
       * taxonomy, the brands and the SEO copy below — but it has no notion of ?page=N, which is
       * why /probiotiques showed the same twelve products at every page number.
       */
      const [{ productsData, serverPagination }, listingSupport] = await Promise.all([
        loadListingPage(listingQuery, {
          subcategories: [canonicalSlug],
          // A subcategory page must never also carry the /shop category filter: the two would
          // intersect and a shopper arriving from a filtered /shop link would see an empty grid.
          categories: [],
        }),
        listingSupportPromise,
      ]);
      const { categories, categoriesForClient, facets, inStockCount } = listingSupport;
      const serverQuery: ShopQuery = { ...listingQuery, page: serverPagination.currentPage };
      /*
       * ── THE LANDING COPY BELONGS TO PAGE 1 ONLY ────────────────────────────────────────────
       *
       * generateMetadata above now lets ?page=2+ be indexed, and that is only defensible if page N
       * stops repeating page 1's editorial block. The intro, the buying guide, the long bottom
       * copy, the FAQ accordion and the FAQPage JSON-LD are the same ~310 words on every page of
       * the series; the crawler view drops them for the same reason, in the same commit
       * (x-crawler/category/[slug]/page.tsx). What stays on page N: the H1 header card, the
       * breadcrumb, the 24 product tiles and the pager.
       *
       * `serverQuery.page`, not `listingQuery.page` — it is the page the API actually returned, so
       * a ?page=99999 that clamps back to the last real page is treated as that page rather than
       * as "paged" forever.
       *
       * The FAQPage schema in particular MUST NOT repeat: the same Q&A block on 473 URLs is a
       * duplicate-structured-data signal, and only page 1 has any claim to the rich result.
       */
      const isPaged = serverQuery.page > 1;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
      const parentCat = sub.sous_category?.categorie;
      const seoJson = await getCategorySeoContent(canonicalSlug);
      const apiSeoSub = (sub as { seo?: CategorySeoFromApi }).seo;
      const merged = mergeCategorySeoForSlug(canonicalSlug, seoJson, apiSeoSub);
      const subCrumbName =
        merged.breadcrumbLabel ||
        merged.h1?.trim() ||
        sub.sous_category?.designation_fr ||
        canonicalSlug;
      /*
       * ── THE TRAIL IS Accueil › Boutique › Parent › Cette page, IN EVERY PLACE THAT DRAWS IT ──
       *
       * The visible breadcrumb (ShopPageClient, `breadcrumbItems.push({ label: 'Boutique' })`),
       * the PDP trail (util/productUrl.ts) and the crawler trail
       * (x-crawler/category/[slug]/page.tsx) all carry the 'Boutique' crumb. This JSON-LD was the
       * only one that skipped it, so the BreadcrumbList a shopper's page emitted described a
       * different site structure from the one Googlebot was handed on the same URL — and from the
       * trail rendered a few hundred pixels below it.
       *
       * The parent crumb is built exactly as the crawler route builds it:
       *   .trim()                — the stored value is "PROTÉINES ", with a trailing space.
       *   canonicalCategoryPath() — an aliased parent slug would otherwise put a URL that 301s
       *                             inside the breadcrumb, which is a redirect in a rich result.
       */
      const breadcrumbItems = [
        { name: 'Accueil', url: '/' },
        { name: 'Boutique', url: '/shop' },
        ...(parentCat?.slug
          ? [
              {
                name: String(parentCat.designation_fr || parentCat.slug).trim(),
                url: canonicalCategoryPath(parentCat.slug),
              },
              { name: subCrumbName, url: `/${canonicalSlug}` },
            ]
          : [{ name: subCrumbName, url: `/${canonicalSlug}` }]),
      ];
      const pageTitle = merged.h1?.trim() || sub.sous_category?.designation_fr || canonicalSlug;
      const collectionDesc =
        (merged.metaDescription ||
          merged.intro?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
          '')
          .slice(0, 500)
          .trim() || undefined;
      const collectionPath = buildShopUrl(
        { ...EMPTY_SHOP_QUERY, page: serverPagination.currentPage },
        `/${canonicalSlug}`
      );
      // pageUrl is the PAGINATED path, the same one the CollectionPage and rel=canonical carry, so
      // /creatine?page=2 wires its own trail and list rather than page 1's.
      const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl, { pageUrl: collectionPath });
      validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
      // Structured data must describe the CURRENT paginated listing. `sub.products` is always the
      // API's fixed first page, so using it here made /creatine?page=2 self-canonical but gave it
      // page 1's ItemList and Product entities. Besides mismatching the visible grid, every page in
      // a category series then emitted duplicate product schema.
      const currentPageProducts = (productsData.products ?? []) as any[];
      /* No .slice(0, 20) here. The grid renders SHOP_PER_PAGE = 24 tiles, so a 20-item cut made
         `numberOfItems` under-report the page by four products and left the last four rows of
         every listing out of the only list markup they appear in. buildItemListSchema already
         caps `itemListElement` at 30 — one page's worth plus headroom — so the payload stays the
         same size and the count now matches what is on screen. */
      const productList = currentPageProducts
        // Use the canonical product URL so ItemList entries match each Product schema's offers.url.
        .map((p: any) => ({ name: p.designation_fr || p.slug, url: getProductLink(p) }))
        .filter((p: { name: string; url: string }) => p.url && p.url !== '/shop/');
      const itemListSchema = productList.length > 0 ? buildItemListSchema(productList, baseUrl, { name: pageTitle, pageUrl: collectionPath }) : null;
      const collectionPageSchema = buildCollectionPageSchema(pageTitle, collectionPath, baseUrl, {
        description: collectionDesc,
        withBreadcrumb: true,
        withItemList: itemListSchema != null,
      });
      validateStructuredData(collectionPageSchema, 'CollectionPage');
      const productSchemas = currentPageProducts
        .slice(0, 6)
        .map((p: any) => buildProductSchema(p, baseUrl))
        .filter(Boolean) as object[];

      const title = merged.h1?.trim() || sub.sous_category?.designation_fr || canonicalSlug;
      // Related-links fallback: uncurated subcategory pages get no relatedCategorySlugs, leaving them
      // with no lateral internal links. Fall back to sibling subcategories under the same parent +
      // the parent category itself so every subcategory is reachable/reaches out.
      const relatedSlugsSub = (merged.relatedCategorySlugs?.length
        ? merged.relatedCategorySlugs
        : (() => {
            const parentSlug = sub.sous_category?.categorie?.slug as string | undefined;
            const parent = parentSlug ? categories.find((c) => c.slug === parentSlug) : undefined;
            const siblingSlugs = (parent?.sous_categories ?? [])
              .map((s: SubCategory) => s.slug)
              .filter((s: string): s is string => Boolean(s) && s !== canonicalSlug);
            return (parentSlug ? [...siblingSlugs, parentSlug] : siblingSlugs).slice(0, 6);
          })()) as string[];
      const relatedCategories = resolveRelatedCategories(relatedSlugsSub, categories);
      // Unique intro fallback (thin-content): when there is no admin/content-file intro, synthesize a
      // distinct paragraph from this page's real product data so every indexed subcategory has copy.
      const introDataSub = deriveIntroDataFromProducts(productsData.products ?? []);
      const introForLandingSub = merged.intro?.trim()
        ? merged.intro
        : generateCategoryIntroFallback({
            name: title,
            productCount: introDataSub.productCount,
            topBrands: introDataSub.topBrands,
            priceMin: introDataSub.priceMin,
          });
      const bestProducts = resolveBestProducts(
        merged.bestProductSlugs?.length ? merged.bestProductSlugs : (productsData.products as any[]).slice(0, 6).map((p: any) => p.slug).filter(Boolean),
        productsData.products as any[]
      );
      const faqPageSchema = !isPaged && merged.faqs?.length ? buildFAQPageSchemaFromQA(merged.faqs) : null;
      if (faqPageSchema) validateStructuredData(faqPageSchema, 'FAQPage');
      // Page N keeps the header card — it carries the H1, and passing null here would make
      // ShopPageClient fall back to its own generic subcategory heading — but not the intro.
      const categorySeoLanding = (
        <CategorySeoLanding
          title={title}
          slug={canonicalSlug}
          banners={merged.banners}
          intro={isPaged ? null : introForLandingSub}
          longBottomHtml={null}
          howToChooseTitle={merged.howToChooseTitle?.trim() ? merged.howToChooseTitle : null}
          howToChooseBody={merged.howToChooseBody?.trim() ? merged.howToChooseBody : null}
          faqs={merged.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          withFaqSchema={false}
          section="header"
        />
      );
      const hasHowTo = Boolean(merged.howToChooseTitle?.trim() && merged.howToChooseBody?.trim());
      const hasLongBottom = Boolean((merged.longBottomHtml ?? '').trim().length > 0);
      const hasSeoContentBelow =
        (introForLandingSub ?? '').trim().length > 0 ||
        (merged.faqs?.length ?? 0) > 0 ||
        hasHowTo ||
        hasLongBottom ||
        relatedCategories.length > 0 ||
        bestProducts.length > 0 ||
        /* A slug that mounts the comparison table must get the below-fold instance even if the CMS
           has written it no copy at all: the table IS content below the fold, and without this
           clause a category with a product grid and an empty SEO record would build the rows, pass
           the gate inside the component, and then never render it because the component itself was
           never mounted. /creatine has an intro, FAQs and lateral links, so this changes nothing
           today — it is here so the gate cannot be switched on for a slug where it silently dies. */
        COMPARISON_SLUGS.has(canonicalSlug);
      const categorySeoLandingBottom = !isPaged && hasSeoContentBelow ? (
        <CategorySeoLanding
          title={title}
          slug={canonicalSlug}
          /*
            ── THE COMPARISON TABLE'S TWO INPUTS, BOTH ALREADY FETCHED ──────────────────────────
            NO NEW REQUEST IS MADE FOR EITHER, and that is the whole reason the table was written
            as a pure server component that fetches nothing.

            `products` is the exact array the grid above is drawing — the page of 24 that
            `loadListingPage` returned for THIS URL, not a second, differently-sorted call. The
            table therefore ranks the products the shopper can already see, which is what makes it
            a summary of the page rather than a second, competing listing.

            `brands` comes off the taxonomy payload this route awaited before it knew which branch
            to take (`productsBySubCategoryId`, which returns `brands` beside `products` — the
            brands of every product in the subcategory, so it is a superset of this page's 24).
            It is needed because the listing endpoint cannot supply it: `shopQueryToApiParams`
            sends `light=1` to /api/all_products precisely to drop the 56 KB brand list, so
            `productsData.brands` is ALWAYS `[]` on this route. Passing that would have satisfied
            the prop and failed the gate, which requires a non-empty lookup — the table would have
            stayed dark while looking wired up.

            Both are passed only to the below-fold instance. The header instance renders above the
            grid, where a price table would sit before the products it compares.
          */
          products={productsData.products}
          brands={await comparisonBrands(canonicalSlug)}
          intro={introForLandingSub}
          longBottomHtml={merged.longBottomHtml?.trim() ? merged.longBottomHtml : null}
          howToChooseTitle={merged.howToChooseTitle?.trim() ? merged.howToChooseTitle : null}
          howToChooseBody={merged.howToChooseBody?.trim() ? merged.howToChooseBody : null}
          faqs={merged.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          withFaqSchema={false}
          section="below-fold"
        />
      ) : null;

      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
          {itemListSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />}
          {faqPageSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }} />}
          {merged.extraJsonLd.map((obj, i) => (
            <script
              // eslint-disable-next-line react/no-array-index-key -- supplementary schemas are stable per deploy
              key={`extra-ld-${canonicalSlug}-${i}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
            />
          ))}
          {productSchemas.map((schema, i) => (
            <script
              key={`product-schema-${canonicalSlug}-${i}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}
          <Suspense
            fallback={
              <>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
                  <ProductsSkeleton />
                </main>
              </>
            }
          >
            <ShopPageClient
              productsData={{ ...productsData, categories: [] }}
              categories={categoriesForClient as never}
              brands={productsData.brands ?? []}
              facets={facets}
              inStockCount={inStockCount}
              initialCategory={canonicalSlug}
              isSubcategory
              serverQuery={serverQuery}
              serverPagination={serverPagination}
              serverBasePath={`/${canonicalSlug}`}
              parentCategory={sub.sous_category?.categorie?.slug ?? undefined}
              categoryBreadcrumbLabel={merged.breadcrumbLabel}
              categorySeoLanding={categorySeoLanding}
              categorySeoLandingBottom={categorySeoLandingBottom}
            />
          </Suspense>
        </>
      );
    }

    if (type === 'category') {
      const cat = data as {
        category: any;
        sous_categories: any[];
        products: any[];
        brands: any[];
      };
      // Same reasoning as the subcategory branch: /sante-vitalite holds 8,849 products and showed
      // twelve of them, with ?page=2 answering 200 and rendering a duplicate of page 1.
      const [{ productsData, serverPagination }, listingSupport] = await Promise.all([
        loadListingPage(listingQuery, {
          categories: [canonicalSlug],
          subcategories: [],
        }),
        listingSupportPromise,
      ]);
      const { categories, categoriesForClient, facets, inStockCount } = listingSupport;
      const serverQuery: ShopQuery = { ...listingQuery, page: serverPagination.currentPage };
      // Same rule as the subcategory branch: the landing copy and the FAQPage schema are page-1
      // furniture. Read the note there for why indexable pagination requires this.
      const isPaged = serverQuery.page > 1;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
      const seoJsonCat = await getCategorySeoContent(canonicalSlug);
      const apiSeoCat = (cat as { seo?: CategorySeoFromApi }).seo;
      const mergedCat = mergeCategorySeoForSlug(canonicalSlug, seoJsonCat, apiSeoCat);
      const catCrumbName = mergedCat.breadcrumbLabel || mergedCat.h1?.trim() || cat.category?.designation_fr || canonicalSlug;
      // Same trail as the subcategory branch above, the visible breadcrumb and the crawler view:
      // Accueil › Boutique › Cette catégorie. 'Boutique' was missing here too.
      const breadcrumbItems = [
        { name: 'Accueil', url: '/' },
        { name: 'Boutique', url: '/shop' },
        { name: catCrumbName, url: `/${canonicalSlug}` },
      ];
      const pageTitleCat = mergedCat.h1?.trim() || cat.category?.designation_fr || canonicalSlug;
      const collectionDescCat =
        (mergedCat.metaDescription ||
          mergedCat.intro?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
          '')
          .slice(0, 500)
          .trim() || undefined;
      const collectionPathCat = buildShopUrl(
        { ...EMPTY_SHOP_QUERY, page: serverPagination.currentPage },
        `/${canonicalSlug}`
      );
      const breadcrumbSchema = buildBreadcrumbListSchema(breadcrumbItems, baseUrl, { pageUrl: collectionPathCat });
      validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
      // As in the subcategory branch, schema follows the current page rather than the taxonomy
      // endpoint's permanently fixed page-1 sample.
      const currentPageProductsCat = (productsData.products ?? []) as any[];
      // Same as the subcategory branch: no 20-item cut, the page shows 24 and the helper caps at 30.
      const productListCat = currentPageProductsCat
        // Use the canonical product URL so ItemList entries match each Product schema's offers.url.
        .map((p: any) => ({ name: p.designation_fr || p.slug, url: getProductLink(p) }))
        .filter((p: { name: string; url: string }) => p.url && p.url !== '/shop/');
      const itemListSchemaCat = productListCat.length > 0 ? buildItemListSchema(productListCat, baseUrl, { name: pageTitleCat, pageUrl: collectionPathCat }) : null;
      const collectionPageSchemaCat = buildCollectionPageSchema(pageTitleCat, collectionPathCat, baseUrl, {
        description: collectionDescCat,
        withBreadcrumb: true,
        withItemList: itemListSchemaCat != null,
      });
      validateStructuredData(collectionPageSchemaCat, 'CollectionPage');
      const productSchemasCat = currentPageProductsCat
        .slice(0, 6)
        .map((p: any) => buildProductSchema(p, baseUrl))
        .filter(Boolean) as object[];

      const title = mergedCat.h1?.trim() || cat.category?.designation_fr || canonicalSlug;
      // Unique intro fallback (thin-content): when there is no admin/content-file intro, synthesize a
      // distinct paragraph from this category's real product data (count, brands, price) + its own
      // subcategory names so every indexed category carries non-duplicate copy.
      const introDataCat = deriveIntroDataFromProducts(productsData.products ?? []);
      const subcategoryNamesCat = (cat.sous_categories ?? [])
        .map((s: any) => s?.designation_fr)
        .filter((n: unknown): n is string => typeof n === 'string' && n.trim().length > 0);
      const introForLandingCat = mergedCat.intro?.trim()
        ? mergedCat.intro
        : generateCategoryIntroFallback({
            name: title,
            productCount: introDataCat.productCount,
            topBrands: introDataCat.topBrands,
            priceMin: introDataCat.priceMin,
            subcategoryNames: subcategoryNamesCat,
          });
      const relatedSlugs = (mergedCat.relatedCategorySlugs?.length
        ? mergedCat.relatedCategorySlugs
        : categories.filter((c) => c.slug !== canonicalSlug).slice(0, 6).map((c) => c.slug)) as string[];
      const relatedCategories = resolveRelatedCategories(relatedSlugs, categories);
      const bestProducts = resolveBestProducts(
        mergedCat.bestProductSlugs?.length ? mergedCat.bestProductSlugs : (productsData.products as any[]).slice(0, 6).map((p: any) => p.slug).filter(Boolean),
        productsData.products as any[]
      );
      const faqPageSchemaCat = !isPaged && mergedCat.faqs?.length ? buildFAQPageSchemaFromQA(mergedCat.faqs) : null;
      if (faqPageSchemaCat) validateStructuredData(faqPageSchemaCat, 'FAQPage');
      // The header card stays on page N so the category keeps its own H1: passing null here would
      // hand ShopPageClient's fallback heading ("Boutique — Protéines & Compléments…") to every
      // paginated category URL, which is a worse duplicate than the one being removed.
      const categorySeoLanding = (
        <CategorySeoLanding
          title={title}
          slug={canonicalSlug}
          banners={mergedCat.banners}
          intro={isPaged ? null : introForLandingCat}
          longBottomHtml={null}
          howToChooseTitle={mergedCat.howToChooseTitle?.trim() ? mergedCat.howToChooseTitle : null}
          howToChooseBody={mergedCat.howToChooseBody?.trim() ? mergedCat.howToChooseBody : null}
          faqs={mergedCat.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          withFaqSchema={false}
          section="header"
        />
      );
      const hasHowToCat = Boolean(mergedCat.howToChooseTitle?.trim() && mergedCat.howToChooseBody?.trim());
      const hasLongBottomCat = Boolean((mergedCat.longBottomHtml ?? '').trim().length > 0);
      const hasSeoContentBelowCat =
        (introForLandingCat ?? '').trim().length > 0 ||
        (mergedCat.faqs?.length ?? 0) > 0 ||
        hasHowToCat ||
        hasLongBottomCat ||
        relatedCategories.length > 0 ||
        bestProducts.length > 0 ||
        // Same clause, same reason as the subcategory branch above.
        COMPARISON_SLUGS.has(canonicalSlug);
      const categorySeoLandingBottom = !isPaged && hasSeoContentBelowCat ? (
        <CategorySeoLanding
          title={title}
          slug={canonicalSlug}
          /*
            The same two props as the subcategory branch, from the same two places: the page of
            products `loadListingPage` already returned, and the brand list the taxonomy payload
            already carried (`productsByCategoryId` returns `brands` beside `products`).

            /creatine resolves as a SUBcategory, so this branch is not what lights the table up
            today — `fetchCategoryOrSubCategory` tries productsBySubCategoryId first and it answers
            200 for this slug. It is wired anyway because leaving one of two symmetric branches
            unfed turns "add a slug to COMPARISON_SLUGS" into a coin flip: a top-level category
            added to that set would pass the gate in the crawler view and fail it here, which is
            exactly the bot-only render the gate exists to make impossible.
          */
          products={productsData.products}
          brands={await comparisonBrands(canonicalSlug)}
          intro={introForLandingCat}
          longBottomHtml={mergedCat.longBottomHtml?.trim() ? mergedCat.longBottomHtml : null}
          howToChooseTitle={mergedCat.howToChooseTitle?.trim() ? mergedCat.howToChooseTitle : null}
          howToChooseBody={mergedCat.howToChooseBody?.trim() ? mergedCat.howToChooseBody : null}
          faqs={mergedCat.faqs ?? []}
          relatedCategories={relatedCategories}
          bestProducts={bestProducts}
          withFaqSchema={false}
          section="below-fold"
        />
      ) : null;

      return (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchemaCat) }} />
          {itemListSchemaCat && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchemaCat) }} />}
          {faqPageSchemaCat && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchemaCat) }} />}
          {mergedCat.extraJsonLd.map((obj, i) => (
            <script
              key={`extra-ld-cat-${canonicalSlug}-${i}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
            />
          ))}
          {productSchemasCat.map((schema, i) => (
            <script
              key={`product-schema-cat-${canonicalSlug}-${i}`}
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
            />
          ))}
          <Suspense
            fallback={
              <>
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
                  <ProductsSkeleton />
                </main>
              </>
            }
          >
            <ShopPageClient
              productsData={{ ...productsData, categories: [] }}
              categories={categoriesForClient as never}
              brands={productsData.brands ?? []}
              facets={facets}
              inStockCount={inStockCount}
              initialCategory={canonicalSlug}
              serverQuery={serverQuery}
              serverPagination={serverPagination}
              serverBasePath={`/${canonicalSlug}`}
              categoryBreadcrumbLabel={mergedCat.breadcrumbLabel}
              categorySeoLanding={categorySeoLanding}
              categorySeoLandingBottom={categorySeoLandingBottom}
            />
          </Suspense>
        </>
      );
    }
  } catch (err) {
    // Preserve framework control-flow errors (notFound()/redirect() thrown inside the try).
    unstable_rethrow(err);
    console.error('Category/SubCategory fetch error:', err);
    // Only a GENUINE backend 404 is a 404. A transient failure (429/5xx/timeout) must rethrow —
    // on this ISR route a notFound() render would cache a wrong 404 for a healthy category for
    // the whole revalidate window. The rethrow hits the error boundary and is never cached.
    if (getErrorStatus(err) === 404) notFound();
    throw err;
  }

  notFound();
}


/**
 * Opt this route into the Full Route Cache. See the long note in app/(shop)/[slug]/page.tsx —
 * Next only registers a dynamic segment in prerenderManifest.dynamicRoutes when the route exports
 * generateStaticParams, and without that entry `export const revalidate` is inert and every
 * request re-renders. An EMPTY array is sufficient: on-demand ISR then covers every path.
 * Deliberately NOT enumerating the catalogue — `next build` runs in CI where Cloudflare 403s the
 * runner, so a fetched list would come back empty or partial and bake bad pages.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}
