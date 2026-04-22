'use client';

import { memo } from 'react';
import { BadgeCheck, Shield } from 'lucide-react';

/**
 * Premium hero trust / money-back strip (Tunisian Derja).
 * Strong hierarchy: headline → guarantee line with emphasized refund + 7 days.
 */
export const HeroTrustGuarantee = memo(function HeroTrustGuarantee() {
  return (
    <aside
      className="relative z-[1] mt-6 w-full max-w-[22rem] sm:mt-7 sm:max-w-md md:mt-8 md:max-w-lg"
      dir="rtl"
      lang="ar"
      aria-label="Garantie : achetez en toute tranquillité, remboursement sous 7 jours si le produit ne vous convient pas"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/25 bg-gradient-to-br from-white/[0.14] via-white/[0.06] to-black/20 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.15),0_20px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-white/10 backdrop-blur-xl sm:rounded-3xl">
        {/* Top accent — premium “seal” strip */}
        <div
          className="h-1 w-full bg-gradient-to-l from-emerald-400/90 via-amber-300/95 to-red-500"
          aria-hidden
        />

        {/* Soft light leak */}
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-amber-200/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-red-500/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex items-stretch gap-3 px-3.5 py-3.5 sm:gap-4 sm:px-5 sm:py-4 md:px-6 md:py-5">
          {/* Icon column (first in RTL = visual right) */}
          <div className="flex shrink-0 flex-col items-center justify-center gap-1" aria-hidden>
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/15 to-white/[0.06] shadow-inner ring-1 ring-emerald-400/35 sm:h-16 sm:w-16 md:h-[4.25rem] md:w-[4.25rem]">
              {/* Lucide defaults to fill=none; fill + text-* = solid green interior, color = stroke outline */}
              <Shield
                fill="currentColor"
                className="h-7 w-7 text-emerald-500 drop-shadow-md sm:h-8 sm:w-8"
                color="rgba(236, 253, 245, 0.92)"
                strokeWidth={1.15}
                aria-hidden
              />
              <div className="absolute -bottom-0.5 -left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-md ring-2 ring-white/90 sm:h-7 sm:w-7">
                <BadgeCheck className="h-3.5 w-3.5 text-white sm:h-4 sm:w-4" strokeWidth={2.5} aria-hidden />
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="min-w-0 flex-1 text-right leading-relaxed">
            <p className="text-[0.9375rem] font-bold tracking-tight text-white drop-shadow-md sm:text-lg md:text-xl">
              جرّب بكل راحة{' '}
              <span className="inline-block align-middle text-[1.05em] leading-none" aria-hidden>
                💪
              </span>
            </p>

            <p className="mt-2 text-[0.8125rem] leading-[1.65] text-white/88 sm:mt-2.5 sm:text-[0.9375rem] md:text-base md:leading-[1.7]">
              <span className="font-medium text-white/80">وإذا ما عجبكش،</span>
              <br className="sm:hidden" aria-hidden />
              <span className="inline-block rounded-md bg-gradient-to-b from-amber-200/25 to-amber-600/10 px-1.5 py-0.5 font-extrabold text-amber-50 shadow-sm ring-1 ring-amber-300/40 sm:rounded-lg sm:px-2 sm:py-0.5">
                فلوسك ترجعلِك
              </span>
              <span className="font-semibold text-white/80"> في </span>
              <span className="relative inline-block align-baseline">
                <span className="relative z-[1] inline-block rounded-lg bg-gradient-to-b from-red-500 to-red-800 px-2 py-0.5 text-sm font-black tracking-wide text-white shadow-[0_2px_10px_rgba(220,38,38,0.55)] ring-1 ring-red-300/70 sm:px-2.5 sm:py-1 sm:text-base md:text-lg">
                  7 أيّام
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Bottom micro-trust row */}
        <div className="flex items-center justify-end gap-x-3 border-t border-white/10 px-3 py-2 sm:px-5 sm:py-2.5 md:px-6">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/45 sm:text-[0.7rem]">
            ضمان استرجاع
          </span>
        </div>
      </div>
    </aside>
  );
});
