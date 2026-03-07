'use client';

import { useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/app/products/[id]/ProductDetailClient';
import { ProductDetailSkeleton } from '@/app/components/ProductDetailSkeleton';
import { Button } from '@/app/components/ui/button';
import { getProductDetails, getSimilarProducts } from '@/services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 800];
const ERROR_DISPLAY_DELAY_MS = 150;
const NOT_FOUND_DELAY_MS = 150;

type Status = 'loading' | 'success' | 'error' | 'notfound';

interface ProductDetailFallbackClientProps {
  slug: string;
}

function is404(err: any): boolean {
  return err?.response?.status === 404 || err?.message === 'Product not found';
}

export function ProductDetailFallbackClient({ slug }: ProductDetailFallbackClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [product, setProduct] = useState<any>(null);
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [showErrorUi, setShowErrorUi] = useState(false);

  const slugReady = !!slug?.trim();

  const load = useCallback(async () => {
    if (!slugReady) return;
    setStatus('loading');
    setShowErrorUi(false);
    setProduct(null);
    setSimilarProducts([]);

    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await getProductDetails(slug.trim());
        if (!data?.id) {
          setStatus('notfound');
          return;
        }
        setProduct(data);
        try {
          const similar =
            data.sous_categorie_id
              ? await getSimilarProducts(data.sous_categorie_id)
              : { products: [] };
          setSimilarProducts(similar?.products ?? []);
        } catch {
          setSimilarProducts([]);
        }
        setStatus('success');
        return;
      } catch (err: any) {
        lastError = err;
        if (is404(err)) {
          setStatus('notfound');
          return;
        }
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    setStatus('error');
    setTimeout(() => setShowErrorUi(true), ERROR_DISPLAY_DELAY_MS);
  }, [slug, slugReady]);

  useEffect(() => {
    if (!slugReady) return;
    load();
  }, [slugReady, load]);

  // Afficher 404 seulement après délai (évite flash) et uniquement quand le fetch a confirmé 404
  useEffect(() => {
    if (status !== 'notfound') return;
    const t = setTimeout(() => {
      notFound();
    }, NOT_FOUND_DELAY_MS);
    return () => clearTimeout(t);
  }, [status]);

  // Slug vide → Skeleton, jamais 404
  if (!slugReady) {
    return <ProductDetailSkeleton />;
  }

  if (status === 'notfound') {
    return <ProductDetailSkeleton />;
  }

  if (status === 'success' && product) {
    return (
      <ProductDetailClient
        product={product}
        similarProducts={similarProducts}
      />
    );
  }

  return (
    <>
      <ProductDetailSkeleton />
      {status === 'error' && showErrorUi && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Problème réseau. Réessayez.</span>
            </div>
            <Button onClick={load} size="sm" className="gap-2 shrink-0">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
