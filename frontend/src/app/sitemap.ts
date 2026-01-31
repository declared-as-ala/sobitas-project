import { MetadataRoute } from 'next';
import { getAllProducts, getAllArticles } from '@/services/api';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

const staticRoutes: MetadataRoute.Sitemap = [
  { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
  { url: `${BASE_URL}/packs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/offres`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: `${BASE_URL}/brands`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  { url: `${BASE_URL}/faqs`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productUrls: MetadataRoute.Sitemap = [];
  let articleUrls: MetadataRoute.Sitemap = [];

  try {
    const { products } = await getAllProducts();
    if (Array.isArray(products) && products.length > 0) {
      productUrls = products
        .filter((p: { slug?: string }) => p.slug)
        .map((p: { slug: string }) => ({
          url: `${BASE_URL}/products/${p.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.85,
        }));
    }
  } catch {
    // keep empty if API fails
  }

  try {
    const articles = await getAllArticles();
    if (Array.isArray(articles) && articles.length > 0) {
      articleUrls = articles
        .filter((a: { slug?: string }) => a.slug)
        .map((a: { slug: string }) => ({
          url: `${BASE_URL}/blog/${a.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));
    }
  } catch {
    // keep empty if API fails
  }

  return [...staticRoutes, ...productUrls, ...articleUrls];
}
