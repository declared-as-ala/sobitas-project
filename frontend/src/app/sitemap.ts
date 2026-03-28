import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/util/sitemapData';

/**
 * Next.js metadata file: serves /sitemap.xml as valid XML (Content-Type: application/xml).
 * ISR with 1-hour revalidation: sitemap is generated on first request then cached,
 * reducing API load and ensuring Cloudflare serves a cached copy to crawlers.
 * On-demand revalidation available via /api/revalidate.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
