'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { CategorySkeleton } from '@/app/components/ProductsSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { Button } from '@/app/components/ui/button';
import { getProductsBySubCategory, getCategories } from '@/services/api';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const ERROR_DISPLAY_DELAY_MS = 180;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [400, 800];

type Status = 'loading' | 'success' | 'empty' | 'error' | 'not_found';

interface SubCategoryPageClientProps {
  categorySlug: string;
  subcategorySlug: string;
}

export function SubCategoryPageClient({ categorySlug, subcategorySlug }: SubCategoryPageClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<{
    productsData: { products: any[]; brands: any[]; categories: any[] };
    categories: any[];
    brands: any[];
  } | null>(null);
  const [showErrorUi, setShowErrorUi] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousDataRef = useRef<typeof data>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!subcategorySlug?.trim()) {
        setStatus('empty');
        setData(null);
        previousDataRef.current = null;
        return;
      }

      setStatus('loading');
      setShowErrorUi(false);
      previousDataRef.current = data;

      let lastError: any;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await getProductsBySubCategory(subcategorySlug.trim(), { signal });
          if (signal?.aborted) return;

          const subcategoryData = result?.sous_category;
          if (!subcategoryData?.designation_fr) {
            setStatus('not_found');
            setData(null);
            return;
          }
          if (subcategoryData.categorie?.slug !== categorySlug) {
            setStatus('not_found');
            setData(null);
            return;
          }

          const categories = await getCategories(signal);
          if (signal?.aborted) return;

          const products = result?.products ?? [];
          const brands = result?.brands ?? [];
          setData({
            productsData: { products, brands, categories: [] },
            categories,
            brands,
          });
          setStatus(products.length > 0 ? 'success' : 'empty');
          previousDataRef.current = null;
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
          lastError = err;
          if (err?.response?.status === 404 || err?.message === 'Subcategory not found') {
            setStatus('not_found');
            setData(null);
            return;
          }
          if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }
      setStatus('error');
      setData(previousDataRef.current);
      setTimeout(() => setShowErrorUi(true), ERROR_DISPLAY_DELAY_MS);
    },
    [categorySlug, subcategorySlug]
  );

  useEffect(() => {
    if (!subcategorySlug?.trim()) {
      setStatus('empty');
      setData(null);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    load(controller.signal);

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [subcategorySlug, categorySlug, load]);

  const handleRetry = useCallback(() => {
    load();
  }, [load]);

  const displayData = data ?? previousDataRef.current;
  const isLoading = status === 'loading';
  const showOverlay = isLoading && !!displayData;

  if (status === 'success' && data) {
    return (
      <ShopPageClient
        productsData={data.productsData}
        categories={data.categories}
        brands={data.brands}
        initialCategory={subcategorySlug}
        isSubcategory={true}
        parentCategory={categorySlug}
      />
    );
  }

  if (showOverlay && displayData) {
    return (
      <>
        <ShopPageClient
          productsData={displayData.productsData}
          categories={displayData.categories}
          brands={displayData.brands}
          initialCategory={subcategorySlug}
          isSubcategory={true}
          parentCategory={categorySlug}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-950/80">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement…
          </div>
        </div>
      </>
    );
  }

  if (status === 'error' && displayData) {
    return (
      <>
        <ShopPageClient
          productsData={displayData.productsData}
          categories={displayData.categories}
          brands={displayData.brands}
          initialCategory={subcategorySlug}
          isSubcategory={true}
          parentCategory={categorySlug}
        />
        {showErrorUi && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Problème réseau. Réessayez.</span>
              <Button onClick={handleRetry} size="sm" className="gap-2 shrink-0">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12 relative">
        {status === 'loading' && !displayData && <CategorySkeleton />}

        {status === 'empty' && (
          <EmptyState
            title="Aucun produit trouvé"
            description="Cette sous-catégorie ne contient aucun produit pour le moment."
            showShopLink
          />
        )}

        {status === 'not_found' && (
          <EmptyState
            title="Catégorie introuvable ou vide"
            description="La sous-catégorie demandée n'existe pas ou ne contient aucun produit."
            showShopLink
          />
        )}

        {status === 'error' && !displayData && (
          <>
            {showErrorUi && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Problème réseau. Réessayez.</span>
                </div>
                <Button onClick={handleRetry} size="sm" className="gap-2 shrink-0">
                  <RefreshCw className="h-4 w-4" />
                  Réessayer
                </Button>
              </div>
            )}
            <CategorySkeleton />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
