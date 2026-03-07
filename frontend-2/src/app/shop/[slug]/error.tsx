'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { CategorySkeleton } from '@/app/components/ProductsSkeleton';
import { AlertCircle, Home, RefreshCw, ShoppingBag } from 'lucide-react';

export default function ShopSlugError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ShopSlugError]', error?.message || error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="w-full mx-auto px-4 sm:px-6 max-w-[1024px] md:max-w-[1280px] lg:max-w-[1400px] xl:max-w-[1600px] py-4 sm:py-8 lg:py-12">
        {/* Banner erreur (non plein écran) */}
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Problème réseau. Réessayez ou consultez la boutique.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={reset} size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/shop">
                <ShoppingBag className="h-4 w-4" />
                Boutique
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                Accueil
              </Link>
            </Button>
          </div>
        </div>
        <CategorySkeleton />
      </main>
      <Footer />
    </>
  );
}
