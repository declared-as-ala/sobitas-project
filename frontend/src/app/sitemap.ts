import { MetadataRoute } from 'next';
import { getAllProducts, getAllArticles, getCategories, getAllBrands } from '@/services/api';
import type { Product, Article, Category, Brand, SubCategory } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

// Static pages with their priorities and change frequencies
const staticPages: MetadataRoute.Sitemap = [
  {
    url: BASE_URL,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1.0,
  },
  {
    url: `${BASE_URL}/shop`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.95,
  },
  {
    url: `${BASE_URL}/packs`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/offres`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  },
  {
    url: `${BASE_URL}/brands`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/blog`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.85,
  },
  {
    url: `${BASE_URL}/about`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${BASE_URL}/contact`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  },
  {
    url: `${BASE_URL}/faqs`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
];

// Helper to get last modified date from product/article
const getLastModified = (item: { updated_at?: string; created_at?: string }): Date => {
  if (item.updated_at) {
    return new Date(item.updated_at);
  }
  if (item.created_at) {
    return new Date(item.created_at);
  }
  return new Date();
};

// Helper to generate slug from name
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .trim();
}

// Type for items with date fields
interface ItemWithDates {
  updated_at?: string;
  created_at?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [...staticPages];

  // Fetch and add all products
  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products) && products.length > 0) {
      const productUrls = products
        .filter((p: Product) => p.slug && p.publier === 1) // Only published products
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
    // Continue without products if API fails
  }

  // Fetch and add all categories and subcategories
  try {
    const categories = await getCategories();
    if (Array.isArray(categories) && categories.length > 0) {
      categories.forEach((category: Category) => {
        if (category.slug) {
          // Add main category page with clean URL
          sitemapEntries.push({
            url: `${BASE_URL}/category/${category.slug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          });

          // Add subcategory pages with parent category in URL
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
    // Continue without categories if API fails
  }

  // Fetch and add all brands
  try {
    const brands = await getAllBrands();
    if (Array.isArray(brands) && brands.length > 0) {
      brands.forEach((brand: Brand) => {
        if (brand.id && brand.designation_fr) {
          const brandSlug = nameToSlug(brand.designation_fr);
          sitemapEntries.push({
            url: `${BASE_URL}/brand/${brandSlug}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.75,
          });
        }
      });
    }
  } catch (error) {
    console.error('Error fetching brands for sitemap:', error);
    // Continue without brands if API fails
  }

  // Fetch and add all blog articles
  try {
    const articles = await getAllArticles();
    if (Array.isArray(articles) && articles.length > 0) {
      const articleUrls = articles
        .filter((a: Article) => a.slug) // Only articles with slugs
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
    // Continue without articles if API fails
  }

  return sitemapEntries;
}
