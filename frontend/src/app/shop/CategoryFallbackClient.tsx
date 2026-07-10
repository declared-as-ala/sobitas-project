'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { CategorySkeleton } from '@/app/components/ProductsSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { Button } from '@/app/components/ui/button';
import { getProductsByCategory, getProductsBySubCategory, getCategories } from '@/services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ERROR_DISPLAY_DELAY_MS = 180;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [400, 800, 1600];

type Status = 'loading' | 'success' | 'empty' | 'error' | 'not_found';

interface CategoryFallbackClientProps {
  slug: string;
}

export function CategoryFallbackClient({ slug }: CategoryFallbackClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<{
    productsData: { products: any[]; brands: any[]; categories: any[] };
    categories: any[];
    brands: any[];
    isSubcategory: boolean;
    categoryName?: string;
  } | null>(null);
  const [showErrorUi, setShowErrorUi] = useState(false);

  const load = useCallback(async () => {
    if (!slug?.trim()) {
      setStatus('not_found');
      return;
    }
    setStatus('loading');
    setShowErrorUi(false);
    setData(null);

    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        let result: any;
        let isSubcategory = false;
        try {
          result = await getProductsByCategory(slug);
        } catch (e: any) {
          if (e?.response?.status === 404 || e?.message === 'Category not found') {
            result = await getProductsBySubCategory(slug);
            isSubcategory = true;
          } else {
            throw e;
          }
        }
        const categoryData = result?.category || result?.sous_category;
        if (!categoryData?.designation_fr) {
          setStatus('not_found');
          return;
        }
        const categories = await getCategories();
        const products = result?.products ?? [];
        const brands = result?.brands ?? [];
        setData({
          productsData: { products, brands, categories: [] },
          categories,
          brands,
          isSubcategory,
          categoryName: categoryData.designation_fr,
        });
        setStatus(products.length > 0 ? 'success' : 'empty');
        return;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404 || err?.message === 'Category not found' || err?.message === 'Subcategory not found') {
          setStatus('not_found');
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
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  // Success: ShopPageClient has its own Header/main/Footer
  if (status === 'success' && data) {
    return (
      <ShopPageClient
        productsData={data.productsData}
        categories={data.categories}
        brands={data.brands}
        initialCategory={slug}
        isSubcategory={data.isSubcategory}
      />
    );
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {status === 'loading' && <CategorySkeleton />}
        {status === 'empty' && data && (
          <EmptyState
            title="Aucun produit trouvé"
            description="Cette catégorie ne contient aucun produit pour le moment."
            showShopLink
          />
        )}
        {status === 'not_found' && (
          <EmptyState
            title="Catégorie introuvable ou vide"
            description="La catégorie demandée n'existe pas ou ne contient aucun produit."
            showShopLink
          />
        )}
        {status === 'error' && (
          <>
            {showErrorUi && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Problème réseau. Réessayez.</span>
                </div>
                <Button onClick={load} size="sm" className="gap-2 shrink-0 bg-red-600 hover:bg-red-700 text-white">
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
