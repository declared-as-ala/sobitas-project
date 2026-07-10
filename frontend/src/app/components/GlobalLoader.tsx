'use client';

import { useLoading } from '@/contexts/LoadingContext';

/**
 * Global navigation feedback: a thin red progress bar pinned to the top of the viewport.
 * Replaces the old full-screen dark scrim + spinner modal, which painted OVER route-level
 * loading.tsx skeletons (user saw a modal, then a skeleton, then content). A top bar signals
 * navigation without hiding the skeleton underneath. Action/data loaders still use LoadingSpinner.
 */
export function GlobalLoader() {
  const { isLoading } = useLoading();

  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[9999] h-0.5 bg-red-600 dark:bg-red-500 animate-pulse"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement de la page"
    />
  );
}
