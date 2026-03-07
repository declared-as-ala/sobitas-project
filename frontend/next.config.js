/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_API_URL = what the client calls (e.g. https://protein.tn/api-proxy for production)
// API_BACKEND_URL = where /api-proxy rewrites to (e.g. https://admin.protein.tn/api)
// STORAGE_BACKEND_URL = where /storage-proxy rewrites to (e.g. https://admin.protein.tn/storage)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://admin.protein.tn/api';
const STORAGE_BACKEND_URL = process.env.STORAGE_BACKEND_URL || 'https://admin.protein.tn/storage';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Enable optimization for LCP, bandwidth. Ensure sharp is available in Docker/standalone.
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.protein.tn' },
      { protocol: 'https', hostname: 'admin.sobitas.tn' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'protein.tn' },
      { protocol: 'https', hostname: 'sobitas.tn' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    qualities: [25, 50, 70, 75, 80, 85, 90, 95, 100],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
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
        source: '/icon.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
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
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.protein.tn',
          },
        ],
        destination: 'https://protein.tn/:path*',
        permanent: true,
      },
    ];
  },
  experimental: {
    // Disable the client-side Router Cache for both dynamic and static pages.
    // This ensures navigating to /blog always fetches fresh RSC payloads from the server,
    // preventing stale articles from appearing after admin edits/deletes.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'motion',
      'sonner',
    ],
  },
}

module.exports = nextConfig
