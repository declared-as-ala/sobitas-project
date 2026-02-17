import { NextResponse } from 'next/server';
import { getSitemapEntries } from '@/util/sitemapData';

const XML_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function lastmodFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Serves /sitemap.xml as valid XML with Content-Type: application/xml.
 * Fixes GSC "Le sitemap est un fichier HTML" by ensuring XML response and headers.
 */
export async function GET() {
  try {
    const entries = await getSitemapEntries();
    const urlElements = entries
      .map((entry) => {
        const loc = escapeXml(entry.url);
        const lastmod = entry.lastModified
          ? lastmodFromDate(new Date(entry.lastModified))
          : lastmodFromDate(new Date());
        const changefreq = entry.changeFrequency ?? 'weekly';
        const priority = entry.priority ?? 0.5;
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${XML_NS}">\n${urlElements}\n</urlset>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error('Sitemap XML generation error:', error);
    return new NextResponse('Sitemap generation failed', { status: 500 });
  }
}
