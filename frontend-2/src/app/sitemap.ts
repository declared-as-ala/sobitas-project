import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/util/sitemapData';

/**
 * Next.js metadata file: serves /sitemap.xml as valid XML (Content-Type: application/xml).
 * Force dynamic so the sitemap is generated at request time (not at build), avoiding
 * build timeout when the API is slow or unreachable during Docker/build.
 * Google Search Console will get a fresh sitemap when it crawls.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
