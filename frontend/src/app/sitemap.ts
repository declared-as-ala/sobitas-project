import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/util/sitemapData';

/**
 * Next.js metadata file: serves /sitemap.xml as valid XML (Content-Type: application/xml).
 * force-dynamic: never pre-rendered at build time (API is unreachable from CI Docker environment).
 * Generated on first real request then cached for 1 hour via revalidate.
 * On-demand revalidation available via /api/revalidate.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
