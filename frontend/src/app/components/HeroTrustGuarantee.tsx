import { ShieldCheck, RotateCcw, BadgeCheck } from 'lucide-react';

export type HeroTrustGuaranteeLayout = 'inline' | 'docked';

export interface HeroTrustGuaranteeProps {
  /** `docked` = compact bottom strip on mobile. `inline` = full card on lg+. */
  layout?: HeroTrustGuaranteeLayout;
}

const TRUST_PILLARS = [
  { Icon: RotateCcw, label: 'Remboursement intégral' },
  { Icon: BadgeCheck, label: 'Sans condition' },
  { Icon: ShieldCheck, label: '100% garanti' },
] as const;

/**
 * Flat, French, one-accent trust guarantee shown over the hero image. Rebuilt from the old
 * glassmorphism/emerald/Arabic-derja version: static (no motion, no orbs/shimmer/halo/radar,
 * no backdrop-blur), red single accent, lucide icons, French copy — matches FeaturesSection.
 * Rendered over dark hero imagery, so it uses a solid-ish dark panel + hairline border.
 */
export function HeroTrustGuarantee({ layout = 'inline' }: HeroTrustGuaranteeProps) {
  const isDocked = layout === 'docked';

  /* DOCKED — compact mobile strip */
  if (isDocked) {
    return (
      <aside aria-label="Satisfait ou remboursé sous 7 jours" className="relative z-[1] w-full">
        <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-gray-950/75 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[0.8125rem] font-medium leading-snug text-white/90">
            Satisfait ou remboursé{' '}
            <span className="font-display uppercase tracking-wide text-white">sous 7 jours</span>
          </p>
        </div>
      </aside>
    );
  }

  /* INLINE — desktop card */
  return (
    <aside
      aria-label="Satisfait ou remboursé sous 7 jours"
      className="relative z-[1] w-full max-w-[26rem] md:max-w-[28rem]"
    >
      <div className="rounded-2xl border border-white/15 bg-gray-950/75 shadow-lg">
        <div className="flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white sm:h-14 sm:w-14">
            <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display uppercase tracking-tight text-lg font-bold leading-none text-white sm:text-xl">
              Satisfait ou remboursé
            </p>
            <p className="mt-1 text-sm text-white/70">Retour gratuit sous 7 jours, sans condition.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 px-5 py-3 sm:px-6">
          {TRUST_PILLARS.map(({ Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80">
              <Icon className="h-3.5 w-3.5 text-red-400" strokeWidth={2} aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
