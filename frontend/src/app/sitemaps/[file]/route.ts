import { NextResponse } from 'next/server';

import { getEntriesForFile, renderUrlSet, SITEMAP_CACHE_HEADER } from '@/util/sitemapXml';

/**
 * /sitemaps/{file} — one child sitemap, e.g. /sitemaps/products-0.xml.
 *
 * Valid names come from the manifest (getSitemapManifest), never from the request: an unknown name
 * 404s rather than rendering an empty <urlset>, so a crawler probing /sitemaps/anything.xml cannot
 * mint an infinite family of empty, indexable sitemap URLs.
 *
 * All children share the ONE cached catalogue crawl, so a crawler fetching the whole index costs a
 * single upstream pass.
 */
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;

  try {
    const entries = await getEntriesForFile(file);

    if (entries === null) {
      return new NextResponse('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    return new NextResponse(renderUrlSet(entries), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': SITEMAP_CACHE_HEADER,
      },
    });
  } catch (error) {
    console.error(`[sitemap] child "${file}" generation failed:`, error);
    // 503 + Retry-After, never a 200 with a truncated list: a short sitemap reads to Google as
    // "these URLs were removed", and that is exactly the signal we spent this whole audit undoing.
    return new NextResponse('sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }
}
