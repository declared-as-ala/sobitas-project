'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Article } from '@/types';

const PromoBanner = dynamic(
  () => import('@/app/components/PromoBanner').then((mod) => ({ default: mod.PromoBanner })),
  { ssr: false, loading: () => null }
);

const BlogSection = dynamic(
  () => import('@/app/components/BlogSection').then((mod) => ({ default: mod.BlogSection })),
  { ssr: false, loading: () => null }
);

const BrandsSection = dynamic(
  () => import('@/app/components/BrandsSection').then((mod) => ({ default: mod.BrandsSection })),
  { ssr: false, loading: () => null }
);

const ScrollToTop = dynamic(
  () => import('@/app/components/ScrollToTop').then((mod) => ({ default: mod.ScrollToTop })),
  { ssr: false, loading: () => null }
);

function useIdleReady(timeout = 1200) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const show = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(show, { timeout });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(show, Math.min(timeout, 400));
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [timeout]);

  return ready;
}

export function HomeDeferredSections({ articles }: { articles: Article[] }) {
  const ready = useIdleReady();

  return (
    <>
      {ready ? (
        <>
          <PromoBanner />
          <BlogSection articles={articles} />
          <BrandsSection />
        </>
      ) : null}
      <ScrollToTop />
    </>
  );
}
