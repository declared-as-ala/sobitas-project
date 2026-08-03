import { Button } from '@/app/components/ui/button';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { Section } from '@/app/components/layout/Section';
import { ArrowRight, Flame } from 'lucide-react';

/**
 * The one orange band — now a STRIP, not a screen.
 *
 * It measured 468px on desktop and ~380px on a 390px phone: on mobile that is a full screen of
 * flat orange you scroll past between two content sections. Removing it is the single largest
 * length saving on the page (−348px desktop). Nothing is lost, because the band only ever carried
 * one message and one destination — the paragraph merely restated the headline, and the second
 * "En savoir plus" button pointed at /shop, which the header already links to. A promo band with
 * two CTAs has no CTA.
 *
 * THE NUMBER IS NOW IN THE HEADLINE. It used to be buried in a paragraph inside a `text-3xl` span
 * that matched no type step. "JUSQU'À −30% SUR UNE SÉLECTION" reads as one statement.
 *
 * DARK MODE IS A STATIC RAMP SHADE, NOT THE THEME ACCENT. `.pt-promo` points the band at #D53B04
 * in light and #8A2E0C in dark. Using `bg-brand` would resolve to #FF8A4C in dark and paint a
 * full-bleed flashbang across a #0A0A0B page. The rule this establishes, now written into
 * tokens.css: theme-aware accent for TYPE and small marks, static ramp shade for any large filled
 * surface.
 *
 * WHITE IS THE ONLY INK HERE. Nothing lighter clears 4.5:1 on #D53B04 — white/70 composites to
 * #F2C4B4 at 2.99:1 — so `.pt-promo` re-points the COMPLETE token set, including `--c-ink-3`,
 * which would otherwise leak #6C6C73 onto orange at 1.11:1.
 *
 * The copy and the −30% figure are the owner's existing marketing pointing at the existing /offres
 * page. Nothing here is fabricated urgency, an invented count, or a second countdown.
 *
 * Zero-JS server component, unchanged.
 */
export function PromoBanner() {
  return (
    <Section surface="promo" spacing="strip" width="wide" className="relative overflow-hidden">
      {/* The one texture on the page. Zero cost, and it stops the band being a flat rectangle. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        aria-hidden="true"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 22px)',
        }}
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0">
          <span className="pt-kicker mb-2 inline-flex items-center gap-2 text-ink-1">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            Offre limitée
          </span>
          <h2 className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 text-balance lg:text-[2.5rem]">
            Jusqu&apos;à{' '}
            <span className="text-[2.5rem] leading-[0.9] lg:text-[3.5rem]">−30%</span> sur une
            sélection
          </h2>
        </div>

        {/* ONE CTA. `bg-elevated` is white in both themes; `text-brand` inside `.pt-promo`
            resolves to #B63304 (6.06:1 on white) in light and #8A2E0C (8.48:1) in dark. */}
        <Button
          size="lg"
          className="group min-h-[52px] shrink-0 rounded-full bg-elevated px-8 font-display font-extended text-base font-semibold uppercase tracking-wide text-brand hover:bg-elevated/90"
          asChild
        >
          <LinkWithLoading href="/offres" loadingMessage="Chargement des offres...">
            Voir les offres
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </LinkWithLoading>
        </Button>
      </div>
    </Section>
  );
}
