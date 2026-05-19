'use client';

import { useLoading } from '@/contexts/LoadingContext';

export function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[9999] flex items-center justify-center p-4"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 min-w-[200px] justify-center">
        <div
          className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-600 border-t-red-600 dark:border-t-red-500 animate-spin"
          aria-hidden
        />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          {loadingMessage}
        </p>
      </div>
    </div>
  );
}
