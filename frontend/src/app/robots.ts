import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';

/**
 * Generates robots.txt with only standard directives (User-agent, Allow, Disallow, Sitemap).
 * Do not add non-standard lines (e.g. Content-Signal, custom directives) or Lighthouse will report "Unknown directive".
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/account',
    '/account/',
    '/checkout',
    '/checkout/',
    '/cart',
    '/login',
    '/register',
    '/api/',
    '/admin',
    '/admin/',
    '/order-confirmation/',
  ];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: 'Googlebot', allow: '/', disallow },
    ],
    sitemap: `${BASE_URL.replace(/\/$/, '')}/sitemap.xml`,
    // Omitting host: only User-agent, Allow, Disallow, Sitemap are standard; Host is Yandex-specific.
  };
}
