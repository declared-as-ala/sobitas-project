/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');
const buildRedirects = require('./redirects');
// NEXT_PUBLIC_API_URL = what the client calls (e.g. https://protein.tn/api-proxy for production)
// API_BACKEND_URL = where /api-proxy rewrites to (e.g. https://admin.protein.tn/api)
// STORAGE_BACKEND_URL = where /storage-proxy rewrites to (e.g. https://admin.protein.tn/storage)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://admin.protein.tn/api';
const STORAGE_BACKEND_URL = process.env.STORAGE_BACKEND_URL || 'https://admin.protein.tn/storage';

// Only set outputFileTracingRoot when running in the monorepo (parent package-lock.json exists).
// In Docker the build context is only frontend/ so the parent dir has no package.json — setting
// this in Docker breaks the standalone build and server.js is not produced.
const parentLockfile = path.join(__dirname, '..', 'package-lock.json');
const monoRepoRoot = fs.existsSync(parentLockfile) ? path.join(__dirname, '..') : undefined;

const nextConfig = {
  /**
   * Build output directory, overridable so a production build can run WITHOUT destroying a dev
   * server's assets.
   *
   * `next dev` and `next build` both write `.next/`. Running a build (or `next start`) while a dev
   * server is up leaves the running server serving HTML that references stylesheet hashes the
   * build has just replaced — every CSS request 404s and the site renders as unstyled HTML. That
   * happened here: a page served at 400 bytes of CSS instead of 328 kB, and it looked like a
   * catastrophic regression rather than two processes sharing one directory.
   *
   * `NEXT_DIST_DIR=.next-verify npm run build` gives the build its own directory. Default is
   * unchanged, so CI and the Dockerfile are unaffected.
   */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'standalone',
  ...(monoRepoRoot && { outputFileTracingRoot: monoRepoRoot }),
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Enable optimization for LCP, bandwidth. Ensure sharp is available in Docker/standalone.
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.protein.tn' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'protein.tn' },
      { protocol: 'https', hostname: 'sobitas.tn' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    // 1920 is required by the full-bleed hero (see util/heroImage.ts DESKTOP_WIDTH); the
    // optimizer rejects any width not listed here. It does not inflate product-grid images:
    // those declare small `sizes` (≤16vw at desktop), so the browser still picks a small
    // candidate — only genuinely full-width slots ever resolve to 1920.
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 2592000, // 30 days
    qualities: [25, 50, 70, 75, 80, 85, 90, 95, 100],
  },
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async headers() {
    // Faceted /shop views must not be indexed as duplicates of the boutique — this is what stopped
    // /shop?search=WHEY%20PROTEIN, /shop?brand=9 and the literal /shop?search={search_term_string}
    // (169 impressions at position 76) accumulating in the index.
    //
    // This used to be `robots: { index: false }` inside generateMetadata, but reading searchParams
    // there is a dynamic API: it opted the whole route out of static rendering, so /shop answered
    // no-store to every visitor and no Cloudflare rule could cache it. As a response header the
    // rule is evaluated per request, so it still applies while the HTML body is cached and shared.
    // Google documents X-Robots-Tag as equivalent to the meta robots tag.
    //
    // `has` entries are AND-ed within a rule, so each facet key needs its own rule to get OR.
    // `page` is deliberately absent: pagination is not a duplicate and must stay indexable.
    const FACET_KEYS = ['search', 'brand', 'category', 'orderby', 'sort', 'min_price', 'max_price', 'filter'];
    const facetedShopNoindex = FACET_KEYS.map((key) => ({
      source: '/shop',
      has: [{ type: 'query', key }],
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
    }));

    return [
      ...facetedShopNoindex,
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "frame-src 'self' https://www.google.com",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "style-src 'self' 'unsafe-inline' https:",
              "img-src 'self' data: https:",
              "font-src 'self' data: https:",
              "connect-src 'self' https:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self' https:"
            ].join('; '),
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000' }],
      },
      // One rule per file — Next.js `source` does not support globs like /favicon-*.png
      ...['/favicon-16x16.png', '/favicon-32x32.png', '/favicon-192x192.png', '/favicon-512x512.png'].map(
        (source) => ({
          source,
          headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000' }],
        })
      ),
      {
        source: '/apple-touch-icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000' }],
      },
      {
        // The app links /site.webmanifest (layout.tsx), not /manifest.json — cache the file
        // that's actually requested.
        source: '/site.webmanifest',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600' }],
      },
      {
        source: '/storage-proxy/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
      },
      {
        source: '/api-proxy/accueil',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
    ];
  },
  async rewrites() {
    // Dev/local: avoid CORS by proxying API and storage through Next.js (browser calls same origin).
    return [
      { source: '/api-proxy/:path*', destination: `${API_BACKEND_URL}/:path*` },
      { source: '/storage-proxy/:path*', destination: `${STORAGE_BACKEND_URL}/:path*` },
    ];
  },
  async redirects() {
    return buildRedirects();
  },
  experimental: {
    /*
     * `optimizeCss` IS OFF, AND THE COMMENT THAT USED TO BE HERE WAS WRONG.
     *
     * It read "Inline critical CSS and load non-critical CSS asynchronously to eliminate
     * render-blocking. Requires `critters` devDependency." — and was set to `true`. Two things
     * were false about that, both verified against the live site and a local production build on
     * 2026-08-03:
     *
     *   1. `critters` WAS NOT INSTALLED. Not in dependencies, not in devDependencies, not in the
     *      lockfile. The flag has therefore never done anything since the day it was added.
     *   2. Installing it changes nothing. With critters@0.0.25 present and `optimizeCss: true`,
     *      a fresh production build still serves ZERO inline <style> blocks and THREE
     *      render-blocking <link rel="stylesheet"> tags. `optimizeCss` is a Pages-Router-era
     *      option; in the App Router, React itself emits the stylesheet links with
     *      `data-precedence` and blocks rendering on them, and critters never sees the document.
     *
     * That mattered because the config was the reason nobody looked at render-blocking CSS: the
     * comment asserted the problem was already solved. Lighthouse mobile disagrees —
     * `render-blocking-resources` is a live finding on protein.tn (150ms) and on a local
     * production build (343ms).
     *
     * Left OFF rather than deleted, with this note, so the next person does not re-add it on the
     * same reasoning. If the render-blocking CSS is to be fixed it needs a different mechanism,
     * and the honest first step is making the sheet smaller — 25 of its 28 kB are unused on the
     * homepage.
     */
    optimizeCss: false,
    // Disable the client-side Router Cache for both dynamic and static pages.
    // With non-zero values the browser REUSES a prefetched RSC payload for that many
    // seconds — so a <Link> prefetched while a page's data was momentarily empty/stale
    // (e.g. an ISR page prerendered before the backend had the data) keeps replaying that
    // stale snapshot on soft navigation, while a hard refresh (which bypasses the Router
    // Cache) shows the correct content. That is exactly the "click Packs → empty, refresh
    // → products appear" bug, and it applied site-wide (shop, category, offres, blog…).
    // 0/0 makes every navigation refetch a fresh RSC payload from the server (the route is
    // still ISR-cached on the origin, so this stays fast), matching the intent above.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-tabs',
      // '@radix-ui/react-tooltip' and 'motion' removed: both packages are gone. Tooltip's only
      // consumer was ui/sidebar.tsx (itself never imported), and `motion` had zero imports in src/
      // at all. Listing an uninstalled package here is harmless but misleading — it reads as
      // "we ship this and tuned it".
      // '@radix-ui/react-dialog' STAYS: ui/dialog.tsx was dead, but ui/sheet.tsx — the mobile menu
      // and cart drawer — imports the package directly.
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-slider',
      'sonner',
      'date-fns',
    ],
  },
}

module.exports = nextConfig
