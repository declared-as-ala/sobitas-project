import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

/**
 * Serves a standards-compliant robots.txt (User-agent, Allow, Disallow, Sitemap, Host only).
 * Using a Route Handler avoids any non-standard directives (e.g. Content-Signal) that could
 * be added by the framework and cause validation errors.
 */
export function GET() {
  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /account',
    'Disallow: /account/',
    'Disallow: /checkout',
    'Disallow: /checkout/',
    'Disallow: /cart',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /order-confirmation/',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    'Disallow: /account',
    'Disallow: /account/',
    'Disallow: /checkout',
    'Disallow: /checkout/',
    'Disallow: /cart',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /order-confirmation/',
    '',
    `Sitemap: ${BASE_URL}/sitemap.xml`,
    `Host: ${BASE_URL}`,
  ];

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
