'use client';

import { memo } from 'react';
import { ShieldCheck } from 'lucide-react';

export type HeroTrustGuaranteeLayout = 'inline' | 'docked';

export interface HeroTrustGuaranteeProps {
  /** `docked` = bottom strip on small screens (compact). `inline` = under CTA on lg+. */
  layout?: HeroTrustGuaranteeLayout;
}

/**
 * Money-back trust strip (Tunisian Derja). Premium glass card; copy is fixed.
 */
export const HeroTrustGuarantee = memo(function HeroTrustGuarantee({
  layout = 'inline',
}: HeroTrustGuaranteeProps) {
  const isDocked = layout === 'docked';
  const mainTextClass = isDocked ? 'text-white/95' : 'text-slate-900';
  const mutedTextClass = isDocked ? 'text-white/[0.82]' : 'text-slate-700';

  return (
    <aside
      className={
        isDocked
          ? 'relative z-[1] w-full max-w-full sm:mx-auto sm:max-w-lg'
          : 'relative z-[1] mt-0 w-full max-w-md md:max-w-xl'
      }
      dir="rtl"
      lang="ar"
      aria-label="Remboursement sous 7 jours si le produit ne vous convient pas"
    >
      <div
        className={
          'group relative overflow-hidden rounded-2xl border border-white/[0.18] bg-gradient-to-br from-white/[0.14] via-white/[0.06] to-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-inset ring-white/[0.08] backdrop-blur-xl sm:rounded-2xl ' +
          (isDocked ? 'sm:backdrop-blur-2xl' : 'md:backdrop-blur-2xl')
        }
      >
        {/* Soft top highlight — premium, not loud */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/35 to-transparent opacity-80"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-48 w-48 rounded-full bg-emerald-400/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-40 w-40 rounded-full bg-red-500/[0.06] blur-3xl"
          aria-hidden
        />

        <div
          className={
            'relative flex items-stretch ' +
            (isDocked ? 'min-h-[3.25rem] sm:min-h-[3.5rem]' : 'min-h-[3.5rem] sm:min-h-[3.75rem]')
          }
        >
          {/* Leading edge (RTL = right): trust accent */}
          <div
            className="w-[3px] shrink-0 self-stretch bg-gradient-to-b from-emerald-300/90 via-emerald-500/80 to-teal-700/70 shadow-[2px_0_12px_rgba(16,185,129,0.25)]"
            aria-hidden
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <div
              className={
                'flex items-center gap-3 sm:gap-4 ' +
                (isDocked ? 'px-3.5 py-2.5 sm:px-4 sm:py-3' : 'px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4')
              }
            >
              <div
                className={
                  'relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-white/20 to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ring-1 ring-white/20 ' +
                  (isDocked ? 'h-10 w-10 sm:h-11 sm:w-11' : 'h-11 w-11 sm:h-12 sm:w-12 md:h-[3.25rem] md:w-[3.25rem]')
                }
                aria-hidden
              >
                <div className="absolute inset-[2px] rounded-[0.875rem] bg-emerald-500/15" />
                <ShieldCheck
                  className={
                    'relative z-[1] text-emerald-100 drop-shadow-sm ' +
                    (isDocked ? 'h-[1.15rem] w-[1.15rem] sm:h-5 sm:w-5' : 'h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem] md:h-6 md:w-6')
                  }
                  strokeWidth={2}
                />
              </div>

              <p
                className={
                  `min-w-0 flex-1 text-right font-medium leading-relaxed tracking-tight ${mainTextClass} antialiased ` +
                  (isDocked
                    ? 'text-[0.8125rem] sm:text-[0.875rem]'
                    : 'text-[0.875rem] sm:text-[0.9375rem] md:text-[1.02rem] md:leading-[1.75]')
                }
              >
                <span className={`font-normal ${mutedTextClass}`}>تنجم ترجّع </span>
                <span className={`font-semibold ${mainTextClass}`}>فلوسك</span>
                <span className={`font-normal ${mutedTextClass}`}> في </span>
                <span className="mx-0.5 inline-flex align-middle">
                  <span
                    className={
                      'inline-flex items-center rounded-lg border border-red-300/35 bg-gradient-to-b from-red-500/95 to-red-700/95 px-2 py-0.5 font-bold tabular-nums tracking-wide text-white shadow-[0_2px_12px_rgba(220,38,38,0.28)] ring-1 ring-inset ring-white/15 ' +
                      (isDocked ? 'text-[0.68rem] sm:text-xs' : 'text-[0.7rem] sm:text-xs md:text-sm')
                    }
                  >
                    7 أيّام
                  </span>
                </span>
                <span className={`font-normal ${mutedTextClass}`}> كان ما عجبكش المنتج </span>
                <span className="inline-block translate-y-px align-middle text-[1.08em] opacity-90" aria-hidden>
                  💯
                </span>
              </p>
            </div>

            {/* Desktop / inline: micro seal; hidden when docked to save mobile height */}
            {!isDocked && (
              <div className="flex items-center justify-end border-t border-white/[0.08] px-3 py-1.5 sm:px-4 sm:py-2 md:px-6">
                <span className="text-[0.62rem] font-medium uppercase tracking-[0.18em] text-white/40 sm:text-[0.65rem]">
                  ضمان استرجاع
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
});
