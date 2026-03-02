import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-6xl sm:text-8xl font-bold text-red-500/90 dark:text-red-400/90">404</h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
        Page introuvable
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Boutique
        </Link>
      </div>
    </div>
  );
}
