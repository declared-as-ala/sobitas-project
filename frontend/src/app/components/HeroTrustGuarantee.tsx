'use client';

import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Tunisian Derja trust / money-back message for the homepage hero.
 * RTL block; visually matches the hero glass + red accent system.
 */
export const HeroTrustGuarantee = memo(function HeroTrustGuarantee() {
  return (
    <aside
      className="mt-5 sm:mt-6 md:mt-8 w-full max-w-lg"
      dir="rtl"
      lang="ar"
      aria-label="Garantie satisfait ou remboursé : achat en toute confiance, remboursement sous 7 jours"
    >
      <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] px-3.5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-md transition-[border-color,box-shadow] duration-300 sm:px-4 sm:py-3.5 md:px-5 md:py-4 hover:border-white/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div
          className="pointer-events-none absolute -left-8 -top-12 h-28 w-28 rounded-full bg-red-500/20 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
          aria-hidden
        />
        <div className="relative flex items-start gap-2.5 sm:gap-3 md:gap-3.5">
          <div
            className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/20 to-white/5 p-2 ring-1 ring-white/25 shadow-inner sm:p-2.5"
            aria-hidden
          >
            <ShieldCheck className="h-5 w-5 text-emerald-300 drop-shadow sm:h-6 sm:w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-1 text-right leading-snug sm:space-y-1.5">
            <p className="text-[0.8125rem] font-semibold tracking-wide text-white drop-shadow-md sm:text-sm md:text-base">
              جرّب بكل ثقة <span className="inline-block translate-y-px">💯</span>
            </p>
            <p className="text-[0.8125rem] text-white/90 drop-shadow sm:text-sm md:text-[0.9375rem]">
              ما عجبكش؟ ترجّع فلوسك في{' '}
              <span className="inline-block rounded-md bg-red-600 px-1.5 py-0.5 font-bold text-white shadow-sm ring-1 ring-red-400/40 sm:px-2 sm:py-0.5">
                7 أيّام
              </span>
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
});
