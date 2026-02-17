'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductCard } from '@/app/components/ProductCard';
import type { Article, Product } from '@/types';

const TITLE = 'Produits recommandés';
const SKELETON_CARD_COUNT = 4;

/** Map common keywords in article title/description to category slugs for recommendations */
const KEYWORD_TO_CATEGORY: { keyword: RegExp; slug: string }[] = [
  { keyword: /\bwhey\b/i, slug: 'whey' },
  { keyword: /\bprot[eé]ine\b/i, slug: 'proteines' },
  { keyword: /\bcréatine\b/i, slug: 'creatine' },
  { keyword: /\bcompl[eé]ment\b|\bvitamine\b/i, slug: 'complements-alimentaires' },
  { keyword: /\bbr[uû]le.?graisse\b|\bminceur\b/i, slug: 'minceur' },
  { keyword: /\bboisson\b|\bpre.?workout\b/i, slug: 'boissons-sport' },
];

function deriveCategorySlug(article: Article): string {
  const text = `${article.designation_fr ?? ''} ${article.description_fr ?? ''} ${article.description ?? ''}`;
  for (const { keyword, slug } of KEYWORD_TO_CATEGORY) {
    if (keyword.test(text)) return slug;
  }
  return '';
}

interface BlogRecommendedProductsProps {
  article: Article;
  /** Optional category slug for smart recommendations (e.g. "whey") */
  categorySlug?: string;
  /** Optional manual override: product slugs set by admin for this post */
  recommendedProductSlugs?: string[];
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[220px] sm:w-[240px] md:flex-shrink md:w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200 dark:bg-gray-800" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
      </div>
    </div>
  );
}

export function BlogRecommendedProducts({
  article,
  categorySlug = '',
  recommendedProductSlugs = [],
}: BlogRecommendedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!sectionRef.current || hasFetched) return;

    const el = sectionRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting || hasFetched) return;
        setHasFetched(true);
      },
      { rootMargin: '200px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasFetched]);

  useEffect(() => {
    if (!hasFetched) return;

    const effectiveCategorySlug = categorySlug?.trim() || deriveCategorySlug(article);
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('articleSlug', article.slug ?? '');
    if (effectiveCategorySlug) params.set('categorySlug', effectiveCategorySlug);
    if (recommendedProductSlugs.length > 0) {
      params.set('productSlugs', recommendedProductSlugs.slice(0, 8).join(','));
    }

    fetch(`/api/blog-recommended-products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) return { products: [] };
        return res.json().catch(() => ({ products: [] }));
      })
      .then((data: { products?: Product[] }) => {
        if (cancelled) return;
        setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasFetched, article, categorySlug, recommendedProductSlugs]);

  if (!hasFetched && !loading) return null;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="blog-recommended-heading"
      className="mt-10 sm:mt-12 lg:mt-16 pt-8 sm:pt-10 border-t border-gray-200 dark:border-gray-800"
    >
      <h2
        id="blog-recommended-heading"
        className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8"
      >
        {TITLE}
      </h2>

      {loading ? (
        <>
          {/* Mobile: horizontal scroll skeleton */}
          <div className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
              <div key={i} className="snap-center">
                <SkeletonCard />
              </div>
            ))}
          </div>
          {/* Desktop: grid skeleton */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun produit recommandé pour le moment.</p>
      ) : (
        <>
          {/* Mobile: horizontal scroll carousel (snap) */}
          <div
            className="md:hidden flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="snap-center flex-shrink-0 w-[220px] sm:w-[260px]"
              >
                <ProductCard product={product} variant="compact" />
              </div>
            ))}
          </div>
          {/* Desktop: 4-column grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} variant="compact" />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
