import type { MetadataRoute } from 'next';
import { getAllProducts, getAllArticles, getCategories, getAllBrands } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

const staticPages: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
  { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/packs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/offres`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/brands`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
  { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/faqs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
];

function getLastModified(item: { updated_at?: string; created_at?: string }): Date {
  if (item.updated_at) return new Date(item.updated_at);
  if (item.created_at) return new Date(item.created_at);
  return new Date();
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

/** Returns sitemap entries for XML. Used by app/sitemap.ts (Next.js metadata file → /sitemap.xml as application/xml). */
export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [...staticPages];

  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products) && products.length > 0) {
      const productUrls = products
        .filter((p: Product) => p.slug && p.publier === 1)
        .map((p: Product) => ({
          url: `${BASE_URL}/shop/${p.slug}`,
          lastModified: getLastModified(p as ItemWithDates),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
      sitemapEntries.push(...productUrls);
    }
  } catch (error) {
    console.error('Error fetching products for sitemap:', error);
  }

  try {
    const categories = await getCategories();
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach((category: Category) => {
        if (category.slug) {
          sitemapEntries.push({
            url: `${BASE_URL}/category/${category.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          });
          if (category.sous_categories && Array.isArray(category.sous_categories)) {
            category.sous_categories.forEach((subCategory: SubCategory) => {
              if (subCategory.slug) {
                sitemapEntries.push({
                  url: `${BASE_URL}/category/${subCategory.slug}`,
                  lastModified: getLastModified(subCategory as ItemWithDates),
                  changeFrequency: 'weekly' as const,
                  priority: 0.75,
                });
              }
            });
          }
        }
      });
    }
  } catch (error) {
    console.error('Error fetching categories for sitemap:', error);
  }

  try {
    const brands = await getAllBrands();
    if (Array.isArray(brands) && brands.length > 0) {
      brands.forEach((brand: Brand) => {
        if (brand.id && brand.designation_fr) {
          sitemapEntries.push({
            url: `${BASE_URL}/brand/${nameToSlug(brand.designation_fr)}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
          });
        }
      });
    }
  } catch (error) {
    console.error('Error fetching brands for sitemap:', error);
  }

  try {
    const articles = await getAllArticles();
    if (Array.isArray(articles) && articles.length > 0) {
      const articleUrls = articles
        .filter((a: Article) => a.slug)
        .map((a: Article) => ({
          url: `${BASE_URL}/blog/${a.slug}`,
          lastModified: getLastModified(a as ItemWithDates),
          changeFrequency: 'monthly' as const,
          priority: 0.6,
        }));
      sitemapEntries.push(...articleUrls);
    }
  } catch (error) {
    console.error('Error fetching articles for sitemap:', error);
  }

  return sitemapEntries;
}
