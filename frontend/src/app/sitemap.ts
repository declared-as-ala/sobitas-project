import { MetadataRoute } from 'next';
import { getAllProducts, getAllArticles, getCategories, getAllBrands } from '@/services/api';
import type { Product, Article, Category, Brand } from '@/types';

const BASE_URL = 'https://protein.tn';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [...staticPages];

  // Fetch and add all products
  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products) && products.length > 0) {
      const productUrls = products
        .filter((p: Product) => p.slug && p.publier === 1) // Only published products
        .map((p: Product) => ({
          url: `${BASE_URL}/products/${p.slug}`,
          lastModified: getLastModified(p as any),
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
          // Add main category page (via shop filter)
          sitemapEntries.push({
            url: `${BASE_URL}/shop?category=${encodeURIComponent(category.slug)}`,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          });

          // Add subcategory pages
          if (category.sous_categories && Array.isArray(category.sous_categories)) {
            category.sous_categories.forEach((subCategory: any) => {
              if (subCategory.slug) {
                sitemapEntries.push({
                  url: `${BASE_URL}/shop?category=${encodeURIComponent(subCategory.slug)}`,
                  lastModified: getLastModified(subCategory),
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
        if (brand.id) {
          sitemapEntries.push({
            url: `${BASE_URL}/shop?brand=${brand.id}`,
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
          lastModified: getLastModified(a as any),
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
