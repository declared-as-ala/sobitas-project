'use client';

import dynamic from 'next/dynamic';
import type { Article, Brand } from '@/types';
import { PromoBanner } from '@/app/components/PromoBanner';
import { BlogSection } from '@/app/components/BlogSection';
import { BrandsSection } from '@/app/components/BrandsSection';
import { GoogleReviewsSection } from '@/app/components/GoogleReviewsSection';

// PromoBanner, BlogSection and BrandsSection are now SERVER-RENDERED (static import) — they were
// dynamic(ssr:false) + gated behind requestIdleCallback, so they were absent from the served HTML
// (invisible to Google) and popped in ~1.2s after load, shifting the SEO block + footer down.
// PromoBanner is a zero-JS server component; Blog/Brands ship their data as props, so SSR is a
// straight LCP/SEO/CLS win. Only ScrollToTop (a floating button, no SEO value) stays client-only.
const ScrollToTop = dynamic(
  () => import('@/app/components/ScrollToTop').then((mod) => ({ default: mod.ScrollToTop })),
  { ssr: false, loading: () => null }
);

export function HomeDeferredSections({ articles, brands }: { articles: Article[]; brands?: Brand[] }) {
  return (
    <>
      <PromoBanner />
      <BlogSection articles={articles} />
      <BrandsSection brands={brands} />
      <GoogleReviewsSection />
      <ScrollToTop />
    </>
  );
}
