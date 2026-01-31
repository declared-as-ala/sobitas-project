import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sobitas.tn';

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
          '/order-confirmation/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
