import Link from 'next/link';
import { Home, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <span className="inline-flex items-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
        <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
        Erreur 404
      </span>
      <h1 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-6xl sm:text-8xl text-gray-900 dark:text-white">
        404
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
        Page introuvable
      </p>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-display uppercase tracking-wide font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400 transition-colors"
        >
          <ShoppingBag className="h-4 w-4" />
          Boutique
        </Link>
      </div>
    </div>
  );
}
