'use client';

import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { useLoading } from '@/contexts/LoadingContext';
import { getStorageUrl } from '@/services/api';

export function GlobalLoader() {
  const { isLoading } = useLoading();

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-[9999] flex items-center justify-center"
          aria-busy="true"
          aria-live="polite"
          role="status"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-lg flex items-center gap-3"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="h-5 w-5 shrink-0"
            >
              <Image
                src={getStorageUrl('coordonnees/September2023/OXC3oL0LreP3RCsgR3k6.webp')}
                alt="Loading"
                width={20}
                height={20}
                className="h-5 w-5 object-contain"
                priority
              />
            </motion.div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Chargement
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
