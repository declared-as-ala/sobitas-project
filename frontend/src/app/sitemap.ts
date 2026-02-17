import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/util/sitemapData';

/**
 * Next.js metadata file: serves /sitemap.xml as valid XML (Content-Type: application/xml).
 * Fixes GSC "Le sitemap est un fichier HTML" by using the framework convention instead of a custom route.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries();
}
