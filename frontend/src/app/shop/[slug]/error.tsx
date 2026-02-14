'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button';
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
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-4 mb-4">
        <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
        Erreur de chargement
      </h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mb-6">
        Un problème réseau ou serveur empêche d&apos;afficher cette page. Réessayez ou revenez à la boutique.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={reset} className="gap-2" size="lg">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/shop">
            <ShoppingBag className="h-4 w-4" />
            Boutique
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg" className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Accueil
          </Link>
        </Button>
      </div>
    </div>
  );
}
