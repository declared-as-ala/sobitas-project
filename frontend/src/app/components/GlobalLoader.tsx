'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';

export function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoading();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[9999] flex items-center justify-center"
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[200px] sm:min-w-[250px]"
          >
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 text-red-600 dark:text-red-400 animate-spin" />
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white text-center">
              {loadingMessage}
            </p>
            <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-600 dark:bg-red-400 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
