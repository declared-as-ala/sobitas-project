/** @type {import('next').NextConfig} */
// Use NEXT_PUBLIC_API_URL from .env (same as frontend api.ts)
const API_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_BACKEND_URL || 'https://admin.sobitas.tn/api';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Proxy API when NEXT_PUBLIC_API_URL points to /api-proxy (avoids CORS and server→API connectivity on protein.tn)
  async rewrites() {
    return [
      { source: '/api-proxy/:path*', destination: `${API_BACKEND_URL.replace(/\/$/, '')}/:path*` },
    ];
  },
  images: {
    loader: 'custom',
    loaderFile: './imageLoader.js',
    domains: ['admin.sobitas.tn', 'admin.protein.tn', 'localhost'],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'admin.protein.tn' },
      { protocol: 'https', hostname: 'admin.sobitas.tn' },
      { protocol: 'https', hostname: 'protein.tn' },
      { protocol: 'https', hostname: 'sobitas.tn' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    qualities: [70, 75, 85, 90, 95, 100],
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
