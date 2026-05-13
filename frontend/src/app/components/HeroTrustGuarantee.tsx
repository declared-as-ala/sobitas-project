'use client';

import { memo, useId } from 'react';
import { ShieldCheck, RotateCcw, BadgeCheck, Sparkles } from 'lucide-react';

export type HeroTrustGuaranteeLayout = 'inline' | 'docked';

export interface HeroTrustGuaranteeProps {
  /** `docked` = compact bottom strip on mobile. `inline` = full card on lg+. */
  layout?: HeroTrustGuaranteeLayout;
}

const TRUST_PILLARS = [
  { Icon: RotateCcw,   label: 'استرجاع كامل' },
  { Icon: BadgeCheck,  label: 'بدون أسئلة'   },
  { Icon: Sparkles,    label: '100% مضمون'   },
] as const;

/* ─────────────────────────────────────────────────────────────────────────── */

export const HeroTrustGuarantee = memo(function HeroTrustGuarantee({
  layout = 'inline',
}: HeroTrustGuaranteeProps) {
  const headingId = useId();
  const isDocked  = layout === 'docked';

  /* ─── DOCKED — mobile compact strip ─────────────────────────────────────── */
  if (isDocked) {
    return (
      <aside
        dir="rtl"
        lang="ar"
        aria-labelledby={headingId}
        className="relative z-[1] w-full"
      >
        <div className="
          group relative overflow-hidden
          rounded-2xl border border-white/[0.18]
          bg-gradient-to-l from-white/[0.13] to-white/[0.06]
          shadow-[0_8px_32px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.14)]
          backdrop-blur-2xl
          transition-all duration-300
        ">
          {/* Top shimmer */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/50 to-transparent" aria-hidden />
          {/* Emerald glow */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" aria-hidden />

          <div className="relative flex items-center gap-3 px-4 py-3">
            {/* Icon */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400/15 to-transparent" aria-hidden />
              <ShieldCheck className="relative z-[1] h-[1.05rem] w-[1.05rem] text-emerald-300" strokeWidth={2.2} aria-hidden />
            </div>

            {/* Text */}
            <p
              id={headingId}
              className="text-[0.8125rem] font-medium leading-snug text-white/90 text-right"
            >
              تنجم ترجع فلوسك في 7ايام كان معجبك منتوج
            </p>
          </div>
        </div>
      </aside>
    );
  }

  /* ─── INLINE — desktop full card ─────────────────────────────────────────── */
  return (
    <aside
      dir="rtl"
      lang="ar"
      aria-labelledby={headingId}
      className="relative z-[1] w-full max-w-[26rem] md:max-w-[28rem]"
    >
      <div className="
        group relative overflow-hidden
        rounded-2xl border border-white/[0.16]
        bg-gradient-to-br from-white/[0.12] via-white/[0.07] to-white/[0.02]
        shadow-[0_16px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.14)]
        ring-1 ring-inset ring-white/[0.07]
        backdrop-blur-2xl
        transition-all duration-500
        hover:border-white/[0.24]
        hover:shadow-[0_20px_56px_rgba(0,0,0,0.44)]
      ">
        {/* ── Decorative background orbs ── */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/[0.14] blur-3xl transition-all duration-700 group-hover:bg-emerald-400/[0.20]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-red-500/[0.10] blur-3xl" aria-hidden />

        {/* ── Top shimmer ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/50 to-transparent opacity-90" aria-hidden />

        {/* ── Emerald leading accent (RTL = right edge) ── */}
        <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-emerald-300/80 via-emerald-500/70 to-teal-700/60 shadow-[-2px_0_16px_rgba(16,185,129,0.28)]" aria-hidden />

        {/* ── Main body ── */}
        <div className="relative px-5 py-4 pr-6 sm:px-6 sm:py-5 sm:pr-7">

          {/* Row 1 — icon + title + 7-day badge */}
          <div className="flex items-start gap-4">

            {/* Shield icon (RTL start = right) */}
            <div className="relative mt-0.5 shrink-0">
              {/* Outer pulsing ring — subtle, slow */}
              <div
                className="absolute -inset-1.5 rounded-2xl bg-emerald-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ animation: 'none' }}
                aria-hidden
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/[0.18] ring-1 ring-emerald-400/30 sm:h-[3.25rem] sm:w-[3.25rem]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-300/15 to-transparent" aria-hidden />
                <ShieldCheck
                  className="relative z-[1] h-6 w-6 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] sm:h-[1.625rem] sm:w-[1.625rem]"
                  strokeWidth={1.9}
                  aria-hidden
                />
              </div>
            </div>

            {/* Text block */}
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-right">

              {/* Headline */}
              <h2
                id={headingId}
                className="text-[1.0rem] font-bold leading-snug tracking-[-0.01em] text-white sm:text-[1.0625rem]"
              >
                تنجم ترجع فلوسك في 7ايام كان معجبك منتوج
              </h2>
            </div>
          </div>

          {/* Row 2 — trust pillars */}
          <div className="mt-4 flex flex-wrap justify-end gap-1.5 border-t border-white/[0.09] pt-3.5">
            {TRUST_PILLARS.map(({ Icon, label }) => (
              <div
                key={label}
                className="
                  flex items-center gap-1.5 rounded-full
                  border border-white/[0.11] bg-white/[0.07]
                  px-3 py-[0.28rem]
                  backdrop-blur-sm
                  transition-all duration-200
                  hover:border-white/[0.22] hover:bg-white/[0.12]
                "
              >
                <Icon className="h-3 w-3 text-emerald-400 opacity-90" strokeWidth={2.3} aria-hidden />
                <span className="text-[0.7rem] font-semibold tracking-wide text-white/75">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer micro-seal ── */}
        <div className="relative border-t border-white/[0.07] px-5 py-2 pr-6 text-right sm:px-6 sm:pr-7">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white/35 sm:text-[0.62rem]">
            ✦&nbsp;satisfait ou remboursé&nbsp;—&nbsp;ضمان معتمد
          </span>
        </div>
      </div>
    </aside>
  );
});
