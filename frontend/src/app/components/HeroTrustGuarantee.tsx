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

/* ───────────────────────────────────────────────────────────────────────────
 * Scoped animations.
 * Guarded behind `prefers-reduced-motion: no-preference` so motion-sensitive
 * users get a fully static card. Durations use `!important` to beat the global
 * mobile cap (`* { animation-duration: .2s !important }` in globals.css) while
 * staying transform/opacity-only for smooth compositing.
 * ─────────────────────────────────────────────────────────────────────────── */
const ANIM_STYLES = `
@keyframes htg-shimmer   { 0% { transform: translateX(-160%) skewX(-18deg); } 100% { transform: translateX(160%) skewX(-18deg); } }
@keyframes htg-breathe   { 0%,100% { opacity:.45; transform: scale(1); } 50% { opacity:.9; transform: scale(1.18); } }
@keyframes htg-breathe-b { 0%,100% { opacity:.35; transform: scale(1.05); } 50% { opacity:.7; transform: scale(.9); } }
@keyframes htg-halo      { to { transform: rotate(360deg); } }
@keyframes htg-radar     { 0% { transform: scale(.75); opacity:.55; } 70% { opacity:0; } 100% { transform: scale(1.7); opacity:0; } }
@keyframes htg-float     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes htg-badge     { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,.45); } 50% { box-shadow: 0 0 0 6px rgba(52,211,153,0); } }
@keyframes htg-rise      { from { opacity:0; transform: translateY(9px); } to { opacity:1; transform: translateY(0); } }
@keyframes htg-dot       { 0%,100% { opacity:.4; transform: scale(.85); } 50% { opacity:1; transform: scale(1); } }

@media (prefers-reduced-motion: no-preference) {
  .htg-shimmer   { animation: htg-shimmer 4.6s ease-in-out .8s infinite !important; }
  .htg-breathe   { animation: htg-breathe 5s ease-in-out infinite !important; }
  .htg-breathe-b { animation: htg-breathe-b 6.5s ease-in-out infinite !important; }
  .htg-halo      { animation: htg-halo 9s linear infinite !important; }
  .htg-radar     { animation: htg-radar 2.8s ease-out infinite !important; }
  .htg-radar-2   { animation: htg-radar 2.8s ease-out 1.4s infinite !important; }
  .htg-float     { animation: htg-float 4s ease-in-out infinite !important; }
  .htg-badge     { animation: htg-badge 2.4s ease-in-out infinite !important; }
  .htg-dot       { animation: htg-dot 1.6s ease-in-out infinite !important; }
  .htg-rise      { animation: htg-rise .55s cubic-bezier(.22,1,.36,1) both !important; }
}
`;

/* Small live "7 أيام" badge — the clarity hook. */
function DayBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`htg-badge inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/[0.16] ring-1 ring-emerald-400/40 font-extrabold text-emerald-200 ${
        compact ? 'px-2 py-[0.1rem] text-[0.68rem]' : 'px-2.5 py-[0.18rem] text-[0.78rem]'
      }`}
    >
      <span className="htg-dot h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
      7 أيام
    </span>
  );
}

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
        <style>{ANIM_STYLES}</style>
        <div className="
          htg-rise group relative overflow-hidden
          rounded-2xl border border-white/[0.18]
          bg-gradient-to-l from-white/[0.13] to-white/[0.06]
          shadow-[0_8px_32px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.14)]
          backdrop-blur-2xl
        ">
          {/* Diagonal shimmer sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="htg-shimmer absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
          </div>
          {/* Top shimmer line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/50 to-transparent" aria-hidden />
          {/* Emerald breathing glow */}
          <div className="htg-breathe pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-400/25 blur-2xl" aria-hidden />

          <div className="relative flex items-center gap-3 px-4 py-3">
            {/* Icon */}
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-400/30">
              <div className="htg-radar pointer-events-none absolute inset-0 rounded-xl ring-1 ring-emerald-400/50" aria-hidden />
              <ShieldCheck className="relative z-[1] h-[1.05rem] w-[1.05rem] text-emerald-300" strokeWidth={2.2} aria-hidden />
            </div>

            {/* Text */}
            <p
              id={headingId}
              className="min-w-0 flex-1 text-[0.8125rem] font-medium leading-snug text-white/90 text-right"
            >
              تنجم ترجع <span className="font-bold text-emerald-300">فلوسك</span> كان معجبك منتوج
            </p>

            <DayBadge compact />
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
      <style>{ANIM_STYLES}</style>
      <div className="
        htg-rise group relative overflow-hidden
        rounded-2xl border border-white/[0.16]
        bg-gradient-to-br from-white/[0.12] via-white/[0.07] to-white/[0.02]
        shadow-[0_16px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.14)]
        ring-1 ring-inset ring-white/[0.07]
        backdrop-blur-2xl
        transition-all duration-500
        hover:border-white/[0.24]
        hover:shadow-[0_20px_56px_rgba(0,0,0,0.44)]
        hover:-translate-y-0.5
      ">
        {/* ── Decorative breathing orbs ── */}
        <div className="htg-breathe pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/[0.16] blur-3xl" aria-hidden />
        <div className="htg-breathe-b pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-red-500/[0.12] blur-3xl" aria-hidden />

        {/* ── Diagonal shimmer sweep across the whole card ── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="htg-shimmer absolute inset-y-0 -left-1/2 w-2/3 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        </div>

        {/* ── Top shimmer line ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/60 to-transparent opacity-90" aria-hidden />

        {/* ── Emerald leading accent (RTL = right edge) ── */}
        <div className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-emerald-300/80 via-emerald-500/70 to-teal-700/60 shadow-[-2px_0_16px_rgba(16,185,129,0.28)]" aria-hidden />

        {/* ── Main body ── */}
        <div className="relative px-5 py-4 pr-6 sm:px-6 sm:py-5 sm:pr-7">

          {/* Row 1 — icon + title + live 7-day badge */}
          <div className="flex items-center gap-4">

            {/* Shield icon (RTL start = right) with rotating halo + radar rings */}
            <div className="htg-float relative shrink-0">
              {/* Rotating conic halo */}
              <div
                className="htg-halo pointer-events-none absolute -inset-1.5 rounded-2xl opacity-70"
                style={{ background: 'conic-gradient(from 0deg, transparent, rgba(52,211,153,0.55), transparent 55%)', filter: 'blur(3px)' }}
                aria-hidden
              />
              {/* Radar pulse rings */}
              <div className="htg-radar pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-emerald-400/50" aria-hidden />
              <div className="htg-radar-2 pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-emerald-400/40" aria-hidden />

              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/[0.20] ring-1 ring-emerald-400/40 sm:h-[3.25rem] sm:w-[3.25rem]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-300/20 to-transparent" aria-hidden />
                <ShieldCheck
                  className="relative z-[1] h-6 w-6 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)] sm:h-[1.625rem] sm:w-[1.625rem]"
                  strokeWidth={1.9}
                  aria-hidden
                />
              </div>
            </div>

            {/* Headline */}
            <h2
              id={headingId}
              className="min-w-0 flex-1 text-right text-[1.0rem] font-bold leading-snug tracking-[-0.01em] text-white sm:text-[1.0625rem]"
            >
              تنجم ترجع <span className="text-emerald-300">فلوسك</span> كان معجبك منتوج
            </h2>

            {/* Live 7-day badge */}
            <DayBadge />
          </div>

          {/* Row 2 — trust pillars (staggered entrance) */}
          <div className="mt-4 flex flex-wrap justify-end gap-1.5 border-t border-white/[0.09] pt-3.5">
            {TRUST_PILLARS.map(({ Icon, label }, i) => (
              <div
                key={label}
                className="
                  htg-rise
                  flex items-center gap-1.5 rounded-full
                  border border-white/[0.11] bg-white/[0.07]
                  px-3 py-[0.28rem]
                  backdrop-blur-sm
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-emerald-500/[0.12]
                "
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
              >
                <Icon className="h-3 w-3 text-emerald-400 opacity-90" strokeWidth={2.3} aria-hidden />
                <span className="text-[0.7rem] font-semibold tracking-wide text-white/80">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer micro-seal ── */}
        <div className="relative border-t border-white/[0.07] px-5 py-2 pr-6 text-right sm:px-6 sm:pr-7">
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white/40 sm:text-[0.62rem]">
            ✦&nbsp;satisfait ou remboursé&nbsp;—&nbsp;ضمان معتمد
          </span>
        </div>
      </div>
    </aside>
  );
});
