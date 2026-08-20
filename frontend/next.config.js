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
      // Imported-catalogue product photography, referenced rather than mirrored.
      //
      // next/image REFUSES to render a host that is not listed here — it throws rather than
      // falling back. The matching server-side allowlist is config/catalog.php
      // `media.external_hosts`, which stops ImagePath::normalize() stripping the domain off these
      // URLs and leaving a path that resolves against our own host. BOTH are required: add a CDN
      // to one and not the other and every imported image silently disappears.
      { protocol: 'https', hostname: 'cloudinary.images-iherb.com' },
      { protocol: 'https', hostname: 's3.images-iherb.com' },
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
    // `flavors` and `in_stock` joined the list when /shop moved to server-side filtering: they are
    // now real, shareable URLs that return a narrowed slice of the boutique, which is exactly the
    // duplicate this rule exists to keep out of the index. A facet key that is not listed here is
    // indexed, and the cost of that mistake compounds — /shop?search={search_term_string} reached
    // 169 impressions at position 76 before anyone noticed it was in there at all.
    /*
     * ── EVERY ALIAS parseShopQuery HONOURS, NOT JUST THE ONES buildShopUrl WRITES ────────────
     * util/shopQuery.ts reads BOTH spellings of three of these — `csv(sp.brand).concat(csv(sp.brands))`
     * and the same for category/categories and subcategory/subcategories. So `/shop?brands=72`,
     * `?categories=…`, `?subcategory=whey-isolate` and `?subcategories=…` all returned a genuinely
     * narrowed slice of the boutique with NO X-Robots-Tag, index/follow, and a canonical pointing
     * at /shop — the "Alternate page with proper canonical" bucket instead of the clean noindex the
     * singular keys get.
     *
     * `buildShopUrl` only ever writes the singular forms, so no internal link mints these; they
     * arrive from external links and hand-typed URLs, which is exactly the traffic this list exists
     * to handle. Note `subcategory` — SINGULAR — was missing too.
     *
     * `page` stays absent on purpose: that is what keeps the 470 real paginated pages indexable.
     */
    const FACET_KEYS = ['search', 'brand', 'brands', 'category', 'categories', 'subcategory', 'subcategories', 'orderby', 'sort', 'min_price', 'max_price', 'filter', 'flavors', 'in_stock'];
    const facetedShopNoindex = FACET_KEYS.map((key) => ({
      source: '/shop',
      has: [{ type: 'query', key }],
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
    }));

    return [
      ...facetedShopNoindex,
      /*
       * MACHINE ENDPOINTS: noindex AS WELL AS robots.txt-disallowed, because the two fail in
       * opposite directions. robots.txt stops a crawl but cannot remove a URL Google already
       * indexed from a link — that is the "Indexed, though blocked by robots.txt" bucket, which is
       * unfixable by robots.txt alone precisely because the crawler is forbidden to fetch the page
       * and see the noindex. The header removes it; the Disallow keeps the budget.
       *
       * Measured 18/08/2026: /api-proxy/blog_tags and /api-proxy/all_articles both answered 200
       * JSON with no X-Robots-Tag whatsoever, and robots.txt disallowed only `/api/`.
       *
       * DELIBERATELY NOT /x-crawler. That prefix is the middleware REWRITE target, and whether a
       * next.config header matches the original path or the rewritten one is not something to be
       * confident about from the docs — and being wrong means `noindex, nofollow` on every
       * category and product page Googlebot is served, i.e. deindexing the whole site. Direct
       * access to /x-crawler is refused in middleware instead, where "am I rewriting, or is
       * someone asking for the internal path" is known rather than inferred.
       */
      {
        source: '/api-proxy/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
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

    /*
     * INLINE THE CSS INTO THE HTML. This is what `optimizeCss` was supposed to do and never could.
     *
     * PageSpeed mobile on protein.tn, 2026-08-03: "Render-blocking requests — Est savings of
     * 1,700 ms", the largest single item in the report by a wide margin. The page ships three
     * <link rel="stylesheet"> tags that React emits with `data-precedence` and blocks rendering
     * on, and on a slow 4G connection each one is a round trip that cannot start until the HTML
     * has arrived. TTFB in the field is 0.8s, so the CSS does not even begin to download until
     * roughly a second in, and nothing paints until it lands.
     *
     * `inlineCss` is the App Router's own mechanism — React emits the CSS as <style> in the
     * document instead of as links — so there is no round trip and no render-blocking request.
     * It requires Next >= 15.2; this project resolves to 15.5.9 (the `^15.1.6` range in
     * package.json had already floated well past the pinned comment elsewhere in this repo).
     *
     * The trade is real and worth stating: the CSS is no longer separately cacheable across
     * navigations, and the document grows by the size of the sheet. Here that is ~28 kB raw and
     * far less over the wire, against removing three blocking round trips on the metric that is
     * failing. On a Tunisian mobile connection that is not a close call.
     *
     * ── AND IT IS OFF, BECAUSE IT WAS MEASURED AND IT LOSES ───────────────────────────────
     * Unlike `optimizeCss`, this one WORKS: a production build with it on serves 1 inline <style>
     * and 0 render-blocking stylesheets, confirmed in the rendered HTML. It is off anyway, and the
     * numbers are why. Median of 5 runs, same machine, tight spread (75-80) so this is signal:
     *
     *                     off        on
     *     FCP          1523 ms   1264 ms     -259  better
     *     LCP          3570 ms   3336 ms     -234  better
     *     TBT           316 ms    608 ms     +292  WORSE, and crosses from "good" into "POOR"
     *     score            81        77
     *
     * The cause is not the flag, it is what the flag has to inline: THE MAIN STYLESHEET IS 196 kB
     * (228 kB across all three), minified, 2,399 rules. `inlineCss` is designed for small
     * per-route CSS; handing it a sheet that size moves a network round trip onto the main thread
     * as parse and style-recalc work, and on a 4x-throttled phone that costs more than the round
     * trip it saves. The document goes 437 kB -> 897 kB.
     *
     * So the 1,700 ms of render-blocking PageSpeed reports is real, but inlining is the wrong
     * lever for it. The two right ones, in order of effort:
     *
     *   1. THE CDN. `cf-cache-status: DYNAMIC` on protein.tn — Cloudflare is not caching the HTML
     *      at all, despite the origin sending `s-maxage=300, stale-while-revalidate`. Field TTFB
     *      is 0.8s, and the CSS request cannot even START until the document arrives, so most of
     *      that 1,700 ms is the TTFB in disguise. Caching the HTML at the edge fixes the
     *      render-blocking estimate AND the LCP AND the TTFB together. Owner action — and it needs
     *      care, because the `vary: rsc, next-router-state-tree, …` header means a naive
     *      "Cache Everything" rule can serve an RSC payload to a browser expecting HTML.
     *   2. THE STYLESHEET. 196 kB is the accumulated cost of 2,037 hand-written `dark:` variants
     *      and ~5,260 lint-flagged literals across 95 files: every distinct arbitrary value
     *      generates its own rule. Token migration (DESIGN_SYSTEM §8) deletes rules rather than
     *      rewriting them. Once the sheet is small, revisit this flag — it becomes a pure win.
     *
     * VERIFY AFTER ANY NEXT UPGRADE, whichever way this is set. `optimizeCss` sat in this file for
     * months doing nothing because nobody checked the rendered HTML. The check is one line:
     *     curl -s https://protein.tn/ | grep -c '<style'
     */
    inlineCss: false,
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
      // '@radix-ui/react-tooltip' removed: its only consumer was ui/sidebar.tsx, itself never
      // imported. Listing an uninstalled package here is harmless but misleading — it reads as
      // "we ship this and tuned it".
      //
      // 'motion' is BACK, and this time it has a real consumer: the pack-builder wizard, which is
      // built on AnimatePresence (exit animations on step change are the one thing CSS genuinely
      // cannot express — an element that is being removed from the DOM has nothing left to
      // transition). It is loaded through LazyMotion + the `m` component, so the whole page pays
      // ~6 kB gzip for the feature set it actually uses rather than ~34 kB for all of it.
      'motion',
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
