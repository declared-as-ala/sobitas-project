/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_API_URL = what the client calls (e.g. https://protein.tn/api-proxy for production)
// API_BACKEND_URL = where /api-proxy rewrites to (e.g. https://admin.protein.tn/api)
// STORAGE_BACKEND_URL = where /storage-proxy rewrites to (e.g. https://admin.protein.tn/storage)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://admin.protein.tn/api';
const STORAGE_BACKEND_URL = process.env.STORAGE_BACKEND_URL || 'https://admin.protein.tn/storage';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    // Production fix: unoptimized=true bypasses Next.js image optimization API.
    // External images (admin.protein.tn) load directly in browser - no CORS,
    // no server-side fetch, no standalone/Docker loader issues.
    unoptimized: true,
    // Allow external domains (used if unoptimized is ever disabled)
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.protein.tn' },
      { protocol: 'https', hostname: 'admin.sobitas.tn' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'protein.tn' },
      { protocol: 'https', hostname: 'sobitas.tn' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
    // Required for Image quality prop (70 used by ProductCard etc). Required in Next.js 16.
    qualities: [70, 75, 85, 90, 95, 100],
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Disable the client-side Router Cache for both dynamic and static pages.
    // This ensures navigating to /blog always fetches fresh RSC payloads from the server,
    // preventing stale articles from appearing after admin edits/deletes.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'motion',
    ],
  },
}

module.exports = nextConfig
