import { NextResponse } from 'next/server';

import { getSitemapManifest, renderSitemapIndex, SITEMAP_CACHE_HEADER } from '@/util/sitemapXml';

/**
 * /sitemap.xml — the sitemap INDEX.
 *
 * Replaces the old `app/sitemap.ts` metadata file, which could only ever emit one flat <urlset>.
 * A route handler is used instead of Next's `generateSitemaps()` so the index lives at exactly
 * /sitemap.xml (the URL already submitted in Search Console and already named in robots.txt)
 * rather than at a framework-chosen path, and so the XML — including the image namespace — is
 * ours to control.
 *
 * force-dynamic for the same reason the old route needed it: the API is unreachable from the CI
 * Docker build, so this must never be prerendered. The underlying data crawl is memoised for an
 * hour by unstable_cache and busted on content change via revalidateTag('sitemap'), so "dynamic"
 * costs a cache read, not a catalogue crawl.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const manifest = await getSitemapManifest();

    // An empty index is worse than no response: Search Console would read it as "this site has no
    // URLs" and start dropping coverage. A transient API failure must surface as a 5xx and be
    // retried instead.
    if (manifest.length === 0) {
      return new NextResponse('sitemap temporarily unavailable', {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
      });
    }

    return new NextResponse(renderSitemapIndex(manifest), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': SITEMAP_CACHE_HEADER,
      },
    });
  } catch (error) {
    console.error('[sitemap] index generation failed:', error);
    return new NextResponse('sitemap temporarily unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }
}
