'use client';

import { motion } from 'motion/react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

/**
 * Same loading experience as "Voir les offres" (GlobalLoader): overlay + card + CSS spinner + message.
 * Used across the app for consistency (blog, brands, account, login, Suspense fallbacks, etc.).
 */
export function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  message = 'Chargement...',
}: LoadingSpinnerProps) {
  const spinnerSizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-2',
  };

  const card = (
    <motion.div
      initial={fullScreen ? { scale: 0.95, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-xl flex items-center gap-3 min-w-[200px] justify-center"
    >
      <div
        className={`shrink-0 rounded-full border-gray-200 dark:border-gray-600 border-t-red-600 dark:border-t-red-500 animate-spin ${spinnerSizeClasses[size]}`}
        aria-hidden
      />
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {message}
      </p>
    </motion.div>
  );

  if (fullScreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[9999] flex items-center justify-center p-4"
        aria-busy="true"
        aria-live="polite"
        role="status"
      >
        {card}
      </motion.div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8" role="status" aria-busy="true">
      {card}
    </div>
  );
}
