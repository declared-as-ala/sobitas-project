import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ArrowRight, Flame } from 'lucide-react';

// Flat, one-accent promo band. Replaced the hotlinked Unsplash background + gradient scrim +
// blurred "orb" decorations + framer-motion entrance with an owned, on-system solid red block
// (no external image dependency, no decorative motion → server component, zero JS).
export function PromoBanner() {
  return (
    <section className="relative overflow-hidden bg-red-600 dark:bg-red-700">
      {/* Single hairline texture — a thin diagonal sheen, not a blurred orb */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 22px)',
        }}
      />

      <div className="relative max-w-site mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="max-w-4xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-white">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Offre limitée
          </span>

          <h2 className="font-display uppercase tracking-tight leading-[0.95] text-4xl sm:text-5xl lg:text-6xl font-bold text-white">
            Transformez votre corps maintenant
          </h2>

          <p className="text-lg sm:text-xl text-white/90">
            Jusqu&apos;à{' '}
            <span className="font-display font-bold tracking-tight tabular-nums text-3xl align-baseline">
              −30%
            </span>{' '}
            sur une sélection de produits premium.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              className="group h-14 bg-white px-8 text-base font-display uppercase tracking-wide font-semibold text-red-600 hover:bg-gray-100"
              asChild
            >
              <LinkWithLoading href="/offres" loadingMessage="Chargement des offres...">
                Voir les offres
                <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
              </LinkWithLoading>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 border-white/70 bg-transparent px-8 text-base font-display uppercase tracking-wide font-semibold text-white hover:bg-white hover:text-red-600"
              asChild
            >
              <LinkWithLoading href="/shop" loadingMessage="Chargement de la boutique...">
                En savoir plus
              </LinkWithLoading>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
