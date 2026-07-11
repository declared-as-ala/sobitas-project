import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { getAllProducts, getAllArticles, getCategories, getAllBrands, getBlogCategories, getBlogTags, getAppPages, getStorageUrl } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory, Page } from '@/types';
import { getProductPrimarySubCategory } from '@/util/productUrl';
import { listCategorySeoSlugs } from '@/util/categorySeoContent';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

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
]);

const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/packs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/offres`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/brands`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
  { url: `${BASE_URL}/qui-sommes-nous`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/faqs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
];

function getLastModified(item: { updated_at?: string; created_at?: string }): Date {
  if (item.updated_at) return new Date(item.updated_at);
  if (item.created_at) return new Date(item.created_at);
  return new Date();
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

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
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

/** Returns sitemap entries for XML. Used by app/sitemap.ts (Next.js metadata file → /sitemap.xml as application/xml). */
async function computeSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const seenUrls = new Set<string>();
  const sitemapEntries: MetadataRoute.Sitemap = [];
  // Lowercased slugs of categories/subcategories that actually exist in the backend.
  // Used to gate the "double insurance" content-file block below so we never emit a
  // root URL for a slug that 404s (e.g. /whey-protein) or 301s (e.g. /mass-gainer).
  const liveCategorySlugs = new Set<string>();

  // Add static pages with dedup
  for (const entry of staticPages) {
    const encoded = encodeSitemapUrl(entry.url);
    if (!seenUrls.has(encoded)) {
      seenUrls.add(encoded);
      sitemapEntries.push({ ...entry, url: encoded });
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

    if (allProducts.length > 0) {
      const productUrls = allProducts
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
          sitemapEntries.push({ ...entry, url: encoded });
        }
      }
    }
  } catch (error) {
    console.error('Error processing products for sitemap:', error);
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
              lastModified: new Date(),
              changeFrequency: normalizeSitemapChangefreq(category.sitemap_changefreq ?? undefined),
              priority: clampPriority(category.sitemap_priority ?? undefined, 0.85),
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
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
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
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.75,
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
        .filter((page: Page) => page.slug && page.slug !== 'api')
        .forEach((page: Page) => {
          const url = `${BASE_URL}/${encodeURIComponent(page.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: getLastModified(page as ItemWithDates),
              changeFrequency: 'monthly' as const,
              priority: 0.55,
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
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.55,
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
        if (tag.slug) {
          const url = `${BASE_URL}/blog/tag/${encodeURIComponent(tag.slug)}`;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            sitemapEntries.push({
              url,
              lastModified: new Date(),
              changeFrequency: 'weekly' as const,
              priority: 0.5,
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
