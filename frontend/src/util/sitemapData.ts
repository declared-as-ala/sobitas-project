import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getAllProducts, getAllArticles, getCategories, getAllBrands, getBlogCategories, getBlogTags, getAppPages, getStorageUrl } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory, Page } from '@/types';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { enrichProductsWithSubcategory } from '@/util/enrichProductSubcategory';
import { listCategorySeoSlugs } from '@/util/categorySeoContent';
import { brandNameToSlug as nameToSlug } from '@/util/brandSlug';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

/**
 * Which child sitemap an entry belongs to. /sitemap.xml is a sitemap INDEX pointing at one file
 * per section, so Search Console reports coverage per content type ("42 of 303 products indexed")
 * instead of one opaque number for the whole site — that is the entire point of splitting it.
 */
export type SitemapSection = 'static' | 'listings' | 'products' | 'blog' | 'pages';

/** A sitemap entry plus the section it belongs to. `section` is stripped before XML is emitted. */
export type SectionedSitemapEntry = MetadataRoute.Sitemap[number] & { section: SitemapSection };

const STATIC_PAGES_SET = new Set([
  `${BASE_URL}/`,
  `${BASE_URL}/shop`,
  `${BASE_URL}/packs`,
  `${BASE_URL}/offres`,
  `${BASE_URL}/brands`,
  `${BASE_URL}/blog`,
  `${BASE_URL}/qui-sommes-nous`,
  `${BASE_URL}/contact`,
  `${BASE_URL}/faqs`,
  `${BASE_URL}/proteine-sousse`,
  `${BASE_URL}/pack-builder`,
]);

const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/shop`, changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/packs`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/offres`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/brands`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/blog`, changeFrequency: 'daily', priority: 0.85 },
  { url: `${BASE_URL}/qui-sommes-nous`, changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/contact`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/faqs`, changeFrequency: 'monthly', priority: 0.7 },
  // Local SEO landing page ("protéine Sousse"): indexable + self-canonical but was orphaned —
  // absent from the sitemap and with no internal links, so it could not be discovered/indexed.
  { url: `${BASE_URL}/proteine-sousse`, changeFrequency: 'monthly', priority: 0.8 },
  // Pack Builder: a real indexable tool page (200 + self-canonical + index,follow) that was
  // orphaned from the sitemap. It also spent time answering 404 to Googlebot only — a reserved-route
  // bug fixed in PR #152 — so it has never actually been crawlable. Submitting it now.
  { url: `${BASE_URL}/pack-builder`, changeFrequency: 'weekly', priority: 0.7 },
];

/**
 * Real change date, or undefined when the record carries none.
 *
 * It previously fell back to "now". Combined with the products API not selecting its
 * timestamps at all, that made EVERY product advertise <lastmod> = the moment of the fetch — so
 * the whole sitemap looked freshly rewritten on every crawl. Google discounts a lastmod it can
 * show is unreliable, so the signal was not just useless but actively spent. Omitting the element
 * is the honest option: Google falls back to its own change detection for that URL only.
 */
function getLastModified(item: { updated_at?: string; created_at?: string }): Date | undefined {
  const raw = item.updated_at || item.created_at;
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Absolute, space-free https image URL for the sitemap <image:image> extension (Google Images),
 * or undefined. Image search already drives real traffic, so product/article covers are declared
 * in /sitemap.xml. Storage paths are resolved through getStorageUrl.
 */
function toSitemapImage(path?: string | null): string | undefined {
  if (!path || typeof path !== 'string') return undefined;
  const raw = /^https?:\/\//i.test(path) ? path : getStorageUrl(path);
  if (!raw || /\s/.test(raw) || !/^https?:\/\//i.test(raw)) return undefined;
  return raw;
}


interface ItemWithDates {
  updated_at?: string;
  created_at?: string;
}

const ALLOWED_CHANGEFREQ = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
]);

function normalizeSitemapChangefreq(
  v: string | null | undefined
): NonNullable<MetadataRoute.Sitemap[0]['changeFrequency']> {
  const s = (v ?? '').trim().toLowerCase();
  if (s && ALLOWED_CHANGEFREQ.has(s)) return s as NonNullable<MetadataRoute.Sitemap[0]['changeFrequency']>;
  return 'weekly';
}

function clampPriority(n: number | null | undefined, fallback: number): number {
  if (n == null || Number.isNaN(Number(n))) return fallback;
  return Math.min(1, Math.max(0, Number(n)));
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function encodeSitemapUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.split('/').map((segment) => {
      if (!segment || segment === '') return segment;
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    }).join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Returns every sitemap entry, each tagged with the child sitemap it belongs to. */
async function computeSitemapEntries(): Promise<SectionedSitemapEntry[]> {
  const seenUrls = new Set<string>();
  const sitemapEntries: SectionedSitemapEntry[] = [];
  // Lowercased slugs of categories/subcategories that actually exist in the backend.
  // Used to gate the "double insurance" content-file block below so we never emit a
  // root URL for a slug that 404s (e.g. /whey-protein) or 301s (e.g. /mass-gainer).
  const liveCategorySlugs = new Set<string>();

  // Add static pages with dedup
  for (const entry of staticPages) {
    const encoded = encodeSitemapUrl(entry.url);
    if (!seenUrls.has(encoded)) {
      seenUrls.add(encoded);
      sitemapEntries.push({ ...entry, url: encoded, section: 'static' });
    }
  }

  // Fetch all data with pagination to avoid API timeouts
  const [categories, brands, pages, articles, blogCategories, blogTags] = await Promise.allSettled([
    getCategories(undefined, { perPage: 500 }),
    getAllBrands(),
    getAppPages(),
    getAllArticles(),
    getBlogCategories(),
    getBlogTags(),
  ]);

  // Product URLs derive their subcategory via getProductPrimarySubCategory (same source
  // as canonical), so no separate id→slug map is needed here.

  // Fetch products in smaller batches with pagination
  try {
    const BATCH_SIZE = 150;
    let currentPage = 1;
    let totalPages = 1;
    const allProducts: Product[] = [];

    while (currentPage <= totalPages) {
      const res = await getAllProducts({ perPage: BATCH_SIZE, page: currentPage });
      if (res?.products && Array.isArray(res.products)) {
        allProducts.push(...res.products);
        if (res.pagination?.last_page) {
          totalPages = res.pagination.last_page;
        }
        currentPage++;
      } else {
        break;
      }
    }

    // Robustness: a product-less sitemap is the regression we just fixed. If the catalogue crawl
    // yields 0 products, THROW so unstable_cache does NOT memoize a degraded (categories-only)
    // sitemap for an hour — the next request retries instead.
    if (allProducts.length === 0) {
      throw new Error('[sitemap] getAllProducts returned 0 products — refusing to cache a product-less sitemap');
    }
    if (allProducts.length > 0) {
      // CRITICAL: /all_products returns products with only `sous_categorie_id` (no relation), so
      // getProductPrimarySubCategory() returned undefined for EVERY product and the filter below
      // dropped the ENTIRE catalogue from the sitemap (0 product URLs → Google couldn't discover any
      // product page). Rebuild the subcategory relation from the categories payload (which ships
      // sous_categories) so all real products land in the sitemap with their canonical URL.
      const categoriesForEnrich =
        categories.status === 'fulfilled' && Array.isArray(categories.value) ? categories.value : [];
      const enrichedProducts = enrichProductsWithSubcategory(allProducts, categoriesForEnrich);
      const productUrls = enrichedProducts
        .filter((p: Product) => p.slug && (p.publier == 1 || p.publier === undefined))
        .map((p: Product) => {
          // Derive the subcategory the SAME way the canonical/link builder does
          // (getProductPrimarySubCategory → sous_categories[0] then sous_categorie),
          // NOT via a separate sous_categorie_id map. When the two disagree, the sitemap
          // lists /A/slug while the page's rel=canonical says /B/slug → Google reports
          // "Google chose a different canonical". Using one source keeps them identical.
          const subCategorySlug = getProductPrimarySubCategory(p)?.slug;
          // Skip products with no resolvable subcategory instead of emitting
          // /shop/{slug}, which middleware immediately 301s → a self-redirecting
          // sitemap URL (a "page with redirect" in Search Console).
          if (!subCategorySlug) return null;
          const coverImg = toSitemapImage(p.cover);
          return {
            url: `${BASE_URL}/${encodeURIComponent(subCategorySlug)}/${encodeURIComponent(p.slug)}`,
            lastModified: getLastModified(p as ItemWithDates),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
            ...(coverImg ? { images: [coverImg] } : {}),
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);
      for (const entry of productUrls) {
        const encoded = encodeSitemapUrl(entry.url);
        if (!seenUrls.has(encoded)) {
          seenUrls.add(encoded);
          sitemapEntries.push({ ...entry, url: encoded, section: 'products' });
        }
      }
    }
  } catch (error) {
    console.error('Error processing products for sitemap:', error);
    // Rethrow: never let unstable_cache store a sitemap whose product crawl failed transiently
    // (that would serve a product-less sitemap for the full 1h TTL).
    throw error;
  }

  try {
    if (categories.status === 'fulfilled' && Array.isArray(categories.value) && categories.value.length > 0) {
      categories.value.forEach((category: Category) => {
        if (!category.slug) return;
        liveCategorySlugs.add(category.slug.toLowerCase());
        (category.sous_categories ?? []).forEach((sc: SubCategory) => {
          if (sc.slug) liveCategorySlugs.add(sc.slug.toLowerCase());
        });
        const catIdx =
          category.sitemap_include !== false &&
          category.robots_index !== false;
        if (catIdx) {
          const url = `${BASE_URL}/${encodeURIComponent(category.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(category as ItemWithDates),
              changeFrequency: normalizeSitemapChangefreq(category.sitemap_changefreq ?? undefined),
              priority: clampPriority(category.sitemap_priority ?? undefined, 0.85),
              section: 'listings',
            });
          }
        }
        if (category.sous_categories && Array.isArray(category.sous_categories)) {
          category.sous_categories.forEach((subCategory: SubCategory) => {
            if (!subCategory.slug) return;
            if (
              subCategory.sitemap_include === false ||
              subCategory.robots_index === false
            ) {
              return;
            }
            const url = `${BASE_URL}/${encodeURIComponent(subCategory.slug)}`;
            if (!seenUrls.has(url)) {
              seenUrls.add(url);
              sitemapEntries.push({
                url,
                lastModified: getLastModified(subCategory as ItemWithDates),
                changeFrequency: normalizeSitemapChangefreq(subCategory.sitemap_changefreq ?? undefined),
                priority: clampPriority(subCategory.sitemap_priority ?? undefined, 0.8),
                section: 'listings',
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error processing categories for sitemap:', error);
  }

  // Double Insurance: add category/subcategory slugs that have localized premium SEO JSON content,
  // but ONLY when the slug corresponds to a category/subcategory that actually exists in the backend.
  // Emitting content-file names blindly previously pushed 404 URLs (/whey-protein), redirecting URLs
  // (/mass-gainer → /gainers-proteines) and mixed-case duplicates (/Intra-Workout) into the sitemap.
  try {
    const seoSlugs = await listCategorySeoSlugs();
    if (Array.isArray(seoSlugs) && seoSlugs.length > 0) {
      seoSlugs.forEach((slug) => {
        const clean = (slug ?? '').trim();
        if (!clean) return;
        // Gate against live backend slugs (case-insensitive). If the category API failed to load,
        // liveCategorySlugs is empty and we skip these rather than risk emitting broken URLs.
        if (!liveCategorySlugs.has(clean.toLowerCase())) return;
        const url = `${BASE_URL}/${encodeURIComponent(clean)}`;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          sitemapEntries.push({
            url,
            changeFrequency: 'weekly',
            priority: 0.8,
            section: 'listings',
          });
        }
      });
    }
  } catch (error) {
    console.error('Error processing SEO content slugs for sitemap:', error);
  }

  try {
    if (brands.status === 'fulfilled' && Array.isArray(brands.value) && brands.value.length > 0) {
      brands.value.forEach((brand: Brand) => {
        if (brand.id && brand.designation_fr) {
          const url = `${BASE_URL}/${nameToSlug(brand.designation_fr)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(brand as ItemWithDates),
              changeFrequency: 'weekly' as const,
              priority: 0.75,
              section: 'listings',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing brands for sitemap:', error);
  }

  try {
    if (pages.status === 'fulfilled' && Array.isArray(pages.value) && pages.value.length > 0) {
      pages.value
        // Gate like categories: don't submit CMS pages an admin marked noindex / excluded from the
        // sitemap (otherwise Search Console flags "Submitted URL marked noindex").
        .filter((page: Page) =>
          page.slug && page.slug !== 'api'
          && (page as { robots_index?: boolean }).robots_index !== false
          && (page as { sitemap_include?: boolean }).sitemap_include !== false
        )
        .forEach((page: Page) => {
          const url = `${BASE_URL}/${encodeURIComponent(page.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(page as ItemWithDates),
              changeFrequency: 'monthly' as const,
              priority: 0.55,
              section: 'pages',
            });
          }
        });
    }
  } catch (error) {
    console.error('Error processing pages for sitemap:', error);
  }

  try {
    if (articles.status === 'fulfilled' && Array.isArray(articles.value) && articles.value.length > 0) {
      const articleUrls = articles.value
        .filter((a: Article) => a.slug)
        .map((a: Article) => {
          const url = `${BASE_URL}/blog/${encodeURIComponent(a.slug)}`;
          const coverImg = toSitemapImage(a.cover);
          return {
            url,
            lastModified: getLastModified(a as ItemWithDates),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
            section: 'blog' as const,
            ...(coverImg ? { images: [coverImg] } : {}),
          };
        });
      for (const entry of articleUrls) {
        if (!seenUrls.has(entry.url)) {
          seenUrls.add(entry.url);
          sitemapEntries.push(entry);
        }
      }
    }
  } catch (error) {
    console.error('Error processing articles for sitemap:', error);
  }

  try {
    if (blogCategories.status === 'fulfilled' && Array.isArray(blogCategories.value)) {
      blogCategories.value.forEach((cat) => {
        if (cat.slug) {
          const url = `${BASE_URL}/blog/category/${encodeURIComponent(cat.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              changeFrequency: 'weekly' as const,
              priority: 0.55,
              section: 'blog',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing blog categories for sitemap:', error);
  }

  try {
    if (blogTags.status === 'fulfilled' && Array.isArray(blogTags.value)) {
      blogTags.value.forEach((tag) => {
        // Blog tag pages are noindex UNLESS a tag explicitly opts in (blog/tag/[slug] sets
        // index = seo.robots.index === true). Only sitemap the opt-in ones, so we never submit a
        // URL that renders <meta robots=noindex> ("Submitted URL marked noindex" in Search Console).
        const tagIndexable = (tag as { seo?: { robots?: { index?: boolean } } })?.seo?.robots?.index === true;
        if (tag.slug && tagIndexable) {
          const url = `${BASE_URL}/blog/tag/${encodeURIComponent(tag.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              changeFrequency: 'weekly' as const,
              priority: 0.5,
              section: 'blog',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error processing blog tags for sitemap:', error);
  }

  return sitemapEntries.filter((entry) => isValidUrl(entry.url));
}

/**
 * Cached sitemap entries. The /sitemap.xml route is `force-dynamic` (the API is unreachable
 * from CI at build time), which makes its `revalidate` a no-op — so without this every crawler
 * poll of /sitemap.xml re-ran the full data crawl (paginated getAllProducts over the whole
 * catalogue + categories + brands + pages + articles + blog cats/tags). unstable_cache memoises
 * the computed payload for 1h; bust on demand with revalidateTag('sitemap').
 */
export const getSitemapEntries = unstable_cache(
  computeSitemapEntries,
  ['sitemap-entries'],
  { revalidate: 3600, tags: ['sitemap'] }
);

/**
 * Entries for ONE section. Every child sitemap calls this, and they all share the single cached
 * crawl above — so a crawler pulling all seven files costs one catalogue crawl, not seven.
 */
export async function getSitemapEntriesForSection(
  section: SitemapSection
): Promise<SectionedSitemapEntry[]> {
  const all = await getSitemapEntries();
  return all.filter((entry) => entry.section === section);
}
