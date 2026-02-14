'use client';

import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { CategorySkeleton } from '@/app/components/ProductsSkeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { ShopPageClient } from '@/app/shop/ShopPageClient';
import { Button } from '@/app/components/ui/button';
import { getProductsBySubCategory, getCategories } from '@/services/api';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ERROR_DISPLAY_DELAY_MS = 180;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [400, 800, 1600];

type Status = 'loading' | 'success' | 'empty' | 'error' | 'not_found';

interface SubCategoryFallbackClientProps {
  categorySlug: string;
  subcategorySlug: string;
}

export function SubCategoryFallbackClient({ categorySlug, subcategorySlug }: SubCategoryFallbackClientProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<{
    productsData: { products: any[]; brands: any[]; categories: any[] };
    categories: any[];
    brands: any[];
  } | null>(null);
  const [showErrorUi, setShowErrorUi] = useState(false);

  const load = useCallback(async () => {
    if (!subcategorySlug?.trim()) {
      setStatus('empty');
      return;
    }
    setStatus('loading');
    setShowErrorUi(false);
    setData(null);

    let lastError: any;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [result, categories] = await Promise.all([
          getProductsBySubCategory(subcategorySlug.trim(), { per_page: 24 }),
          getCategories(),
        ]);
        const subcategoryData = result?.sous_category;
        if (!subcategoryData?.designation_fr) {
          setStatus('not_found');
          return;
        }
        if (subcategoryData.categorie?.slug !== categorySlug) {
          setStatus('not_found');
          return;
        }
        const products = result?.products ?? [];
        const brands = result?.brands ?? [];
        setData({
          productsData: { products, brands, categories: [] },
          categories,
          brands,
        });
        setStatus(products.length > 0 ? 'success' : 'empty');
        return;
      } catch (err: any) {
        lastError = err;
        if (err?.response?.status === 404 || err?.message === 'Subcategory not found') {
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
  }, [categorySlug, subcategorySlug]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <>
      <Header />
      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
        {status === 'loading' && <CategorySkeleton />}
        {status === 'empty' && data && (
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
        {status === 'error' && (
          <>
            {showErrorUi && (
              <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">Problème réseau. Réessayez.</span>
                </div>
                <Button onClick={load} size="sm" className="gap-2 shrink-0">
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
