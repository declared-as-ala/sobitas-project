'use client';

import { X, Sparkles, Gift } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-gradient-to-r from-red-600 via-red-700 to-orange-600 text-white relative overflow-hidden shadow-lg"
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.1)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_3s_infinite]"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-sm md:text-base">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Gift className="h-5 w-5" />
            </motion.div>
            <span className="font-bold">🎉 PROMOTION EXCEPTIONNELLE</span>
            <span className="hidden sm:inline font-medium">• Livraison GRATUITE dès 300 DT</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="hidden lg:flex items-center gap-1 ml-2"
            >
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span className="text-xs font-semibold">NOUVEAU</span>
            </motion.div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/20 rounded-lg transition-all backdrop-blur-sm"
          aria-label="Close announcement"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
