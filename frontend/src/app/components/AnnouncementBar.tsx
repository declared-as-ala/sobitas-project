'use client';

import { X, Sparkles, Gift } from 'lucide-react';
import { useState } from 'react';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-red-600 text-white">
      <div className="relative max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-center gap-3 text-sm md:text-base">
          <Gift className="h-5 w-5 shrink-0" aria-hidden />
          <span className="font-display uppercase tracking-wide font-semibold">🎉 Promotion exceptionnelle</span>
          <span className="hidden sm:inline font-medium text-red-100">• Livraison gratuite dès 300 DT</span>
          <span className="hidden lg:flex items-center gap-1 ml-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            <span className="text-xs font-display uppercase tracking-wide font-semibold">Nouveau</span>
          </span>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/15 rounded-lg transition-colors"
        aria-label="Close announcement"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
