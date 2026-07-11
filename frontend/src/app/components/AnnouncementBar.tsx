'use client';

import { X, Sparkles, Gift } from 'lucide-react';
import { useState } from 'react';

export function AnnouncementBar() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative bg-red-600 text-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* pr-10 reserves room for the absolute close button so text never underlaps it */}
        <div className="flex min-h-[40px] items-center justify-center gap-2 py-2 pr-10 text-center">
          <Gift className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate font-display text-xs font-semibold uppercase tracking-wide sm:text-sm">
            Promotion exceptionnelle
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
            <span className="h-1 w-1 rounded-full bg-red-200/80" aria-hidden />
            <span className="font-display text-xs font-medium uppercase tracking-wide text-red-100 sm:text-sm">
              Livraison gratuite dès 300 DT
            </span>
          </span>
          <span className="ml-1 hidden shrink-0 items-center gap-1 lg:inline-flex">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            <span className="font-display text-xs font-semibold uppercase tracking-wide">Nouveau</span>
          </span>
        </div>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg transition-colors hover:bg-white/15"
        aria-label="Fermer l'annonce"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
