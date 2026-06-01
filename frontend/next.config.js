/** @type {import('next').NextConfig} */
const path = require('path');
const fs = require('fs');
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
    deviceSizes: [480, 640, 750, 828, 1080, 1200],
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
        source: '/manifest.json',
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
    return [
      {
        source: '/about',
        destination: '/qui-sommes-nous',
        permanent: true,
      },
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
    // Inline critical CSS and load non-critical CSS asynchronously to eliminate render-blocking.
    // Requires `critters` devDependency.
    optimizeCss: true,
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
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-slider',
      '@mui/material',
      '@mui/icons-material',
      'motion',
      'sonner',
      'date-fns',
    ],
  },
}

module.exports = nextConfig
