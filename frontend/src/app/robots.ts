import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

/**
 * Generates a standards-compliant robots.txt for SEO.
 * - Index: /, /shop, /category/*, /blog, /blog/*, product pages, static pages
 * - Noindex: account, checkout, cart, login, register, api, admin
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
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
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
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
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
