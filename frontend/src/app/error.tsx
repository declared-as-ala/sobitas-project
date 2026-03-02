'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error?.message ?? error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Une erreur est survenue
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Le chargement de la page a échoué. Vous pouvez réessayer ou retourner à l&apos;accueil.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors inline-block"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
