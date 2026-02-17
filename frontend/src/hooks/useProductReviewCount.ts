'use client';

import { useState, useEffect } from 'react';
import { getProductDetails } from '@/services/api';

/**
 * Fetches review count for a product by slug. Use when the list API doesn't return
 * reviews_count (e.g. home page Nouveaux Produits). Only fetches if initialCount is 0/undefined.
 */
export function useProductReviewCount(slug: string | undefined, initialCount: number | null | undefined): number {
  const [count, setCount] = useState<number>(() => {
    const n = initialCount != null ? Number(initialCount) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  useEffect(() => {
    const n = initialCount != null ? Number(initialCount) : 0;
    if (Number.isFinite(n) && n > 0) {
      setCount(n);
      return;
    }
    if (!slug || typeof slug !== 'string' || !slug.trim()) return;

    let cancelled = false;
    getProductDetails(slug.trim())
      .then((product) => {
        if (cancelled) return;
        const arr = (product as any).reviews ?? (product as any).avis ?? [];
        const list = Array.isArray(arr) ? arr : [];
        const reviewCount = list.filter(
          (r: any) => typeof r?.stars === 'number' && (r.publier === undefined || r.publier === 1)
        ).length;
        if (reviewCount > 0) setCount(reviewCount);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [slug, initialCount]);

  return count;
}
