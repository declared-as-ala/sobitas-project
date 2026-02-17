import type { MetadataRoute } from 'next';

/**
 * robots.txt – must be valid per Lighthouse SEO audit.
 * @see https://developer.chrome.com/docs/lighthouse/seo/robots-txt/
 *
 * Rules we follow:
 * - Every section starts with User-agent (no allow/disallow before first user-agent).
 * - User-agent must have a value (* or a known bot name).
 * - Allow/Disallow values are either empty or start with "/" or "*" (no $ except at end).
 * - Sitemap must be an absolute URL (https://example.com/sitemap.xml).
 * - Only standard directives: User-agent, Allow, Disallow, Sitemap. No unknown directives (e.g. Content-Signal, Host).
 * - File must be served at root (/robots.txt) and not return 5XX; keep under 500 KiB.
 */
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://protein.tn';
const ORIGIN = BASE_URL.replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  // All paths must start with "/" (or "*") per spec; no $ in the middle.
  const disallow: string[] = [
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
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow,
      },
    ],
    // Must be absolute URL (https://...) per Lighthouse.
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
