/** @type {import('next').NextConfig} */
// NEXT_PUBLIC_API_URL = what the client calls (e.g. https://protein.tn/api-proxy for production)
// API_BACKEND_URL = where /api-proxy rewrites to (must be the real API, e.g. https://admin.protein.tn/api)
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'https://admin.protein.tn/api';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Proxy /api-proxy/* to real API (avoids CORS and server→API connectivity on protein.tn)
  async rewrites() {
    return [
      { source: '/api-proxy/:path*', destination: `${API_BACKEND_URL.replace(/\/$/, '')}/:path*` },
    ];
  },
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
  },
  compress: true,
  poweredByHeader: false,
  experimental: {
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
