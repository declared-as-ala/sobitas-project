'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlashDealCard } from './FlashDealCard';
import { Section } from '@/app/components/layout/Section';
import { ArrowRight, Clock, Flame } from 'lucide-react';

interface FlashProduct {
  id: number;
  slug?: string;
  designation_fr?: string;
  prix?: number;
  promo?: number;
  promo_expiration_date?: string;
  cover?: string;
  discount_percent?: number;
  promo_percent?: number;
  [key: string]: unknown;
}

function clampDiscount(percent: number): number {
  if (!Number.isFinite(percent) || percent < 0) return 0;
  return Math.min(90, Math.round(percent));
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * The clock, as ONE inline pill.
 *
 * ── WHAT CHANGED, AND WHY IT IS STILL THE BLACK ON THIS PAGE ───────────────────────────────
 * This used to be four ~64px near-black tiles in a 4-column grid — about 230×64px of black, plus a
 * "SE TERMINE DANS" label above them, sitting in its own column of the band header. It was the
 * single tallest element in the header and it is what forced the header to be a two-row block.
 *
 * As one pill it is ~150×28px and it sits INLINE with the title, on the same line. The black is
 * still spent here and nowhere else — v6's argument holds, the surface is just a fifth of the size.
 * The digits keep `tabular-nums`, so the pill does not twitch as the seconds change.
 *
 * ── THE ACCESSIBILITY CONTRACT IS UNCHANGED ────────────────────────────────────────────────
 * These digits change every second. Exposed, they are either a screen-reader firehose (with
 * aria-live) or an unlabelled cluster of numbers a user lands on mid-count and cannot interpret
 * (without it). The pre-hydration placeholder makes it worse: "--:--:--" is a real announced string
 * that means nothing.
 *
 * So the pill is `aria-hidden` and a single static sentence carries the same information in a form
 * that is actually useful — an absolute date, in a `<time>` element, announced once. No aria-live.
 */
const CountdownDisplay = memo(function CountdownDisplay({ expirationDate }: { expirationDate: Date }) {
  /* Starts null: computing the real remaining time needs Date.now(), which differs between the
     server render and the client. Initialising to zeros made SSR paint "00:00:00" — which looks
     like the sale already ended — and then jump on hydration. A neutral placeholder is
     deterministic on both sides and keeps the pill's width. */
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, expirationDate.getTime() - Date.now());
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (24 * 3600 * 1000)),
        hours: Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000)),
        minutes: Math.floor((diff % (3600 * 1000)) / (60 * 1000)),
        seconds: Math.floor((diff % (60 * 1000)) / 1000),
        isExpired: false,
      });
    };
    updateCountdown();
    const id = setInterval(updateCountdown, 1000);
    return () => clearInterval(id);
  }, [expirationDate]);

  if (countdown?.isExpired) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  /* Split so `.pt-tick` can stay on the SECONDS alone, which is what it was written for: one
     900ms fade per tick, tracking the only digit that actually changed. Putting it on the whole
     string would flash "28J 02:47:54" once a second — three standing digits animating alongside
     the one that moved, next to body copy. That is the fast pulse the rule's own comment warns
     against. */
  const head = countdown
    ? `${countdown.days > 0 ? `${countdown.days}J ` : ''}${pad(countdown.hours)}:${pad(countdown.minutes)}:`
    : '--:--:';
  const secs = countdown ? pad(countdown.seconds) : '--';

  return (
    <>
      {/* `.pt-slab` scopes the pill, so `text-brand` inside resolves to #FF8A4C — 8.14:1 on the
          near-black — and `text-ink-3` to the slab's own muted ink. A component written in tokens
          is correct on this surface without a single `dark:` class. */}
      <span
        className="pt-slab inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5"
        aria-hidden="true"
      >
        <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Fin dans</span>
        <span className="font-display text-sm font-bold tabular-nums leading-none text-brand">
          {head}
          {/* Desktop + no-reduced-motion only; the rule gates itself in globals.css. */}
          <span className="pt-tick">{secs}</span>
        </span>
      </span>
      <span className="sr-only">
        Offre valable jusqu&apos;au{' '}
        {/* `timeZone` is PINNED. Without it the server formats in the container's UTC and the
            browser in the visitor's zone, so any promo expiring near midnight renders a different
            date on each side — a hydration mismatch, the same class of bug the Date.now() note
            above documents. An explicit zone is deterministic everywhere. */}
        <time dateTime={expirationDate.toISOString()}>
          {expirationDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Africa/Tunis',
          })}
        </time>
      </span>
    </>
  );
});

interface VentesFlashSectionProps {
  products: FlashProduct[];
}

/**
 * Ventes Flash — a BANNER, not a band.
 *
 * ── WHAT THE OWNER ASKED FOR ───────────────────────────────────────────────────────────────
 * *"Make it like a banner section, not a wall section. Make the card smaller. Make the ventes
 * flash look better."*
 *
 * The previous version was the tallest thing on the homepage by construction, and deliberately so:
 * `spacing="feature"` (48/64/80 — the only band at that step), a 56px `scale="1"` headline, a
 * subtitle paragraph, a 64px-tall countdown block in its own column, a 4-up grid of full
 * `ProductCard`s, and a 52px centred CTA. On a phone that grid is 2-up over two rows, so the band
 * ran to roughly 1,400px — about two full screens for one promotion.
 *
 * Four changes turn it into a banner, and each of them removes height rather than shrinking type:
 *
 *   1. ONE PLATE. Everything lives in a single bordered, rounded block with a brand rule across
 *      the top. A band says "this is a section of the page"; a plate says "this is one offer".
 *   2. THE HEADER IS ONE ROW. Flame + title + countdown + "Tout voir" on a single line from `sm`.
 *      The subtitle paragraph is gone: the discount it quoted is on every card, as a badge.
 *   3. THE CLOCK IS A PILL. ~150×28px inline, instead of ~230×64px in its own column.
 *   4. THE CARDS ARE A RAIL. A snapping horizontal scroll of 156–176px cards, one row at EVERY
 *      width — which is also what stops the phone from paying for a second row.
 *
 * ── WHY A RAIL IS THE RIGHT SHAPE HERE SPECIFICALLY ────────────────────────────────────────
 * A horizontal shelf is usually a discoverability risk: it hides content behind a gesture people
 * have to notice first. Two things make it correct in this case, and both are visible rather than
 * assumed. The rail always shows a PARTIAL card at the right edge, which is the cue that there is
 * more; and nothing in it is unique — every card is also on `/offres`, which the header links from
 * a control that is on screen the entire time. Nothing is reachable only by swiping.
 *
 * It also stops the grid silently capping the promotion at four. A flash sale with nine products
 * now shows nine.
 *
 * ── THE TYPE SIZE IS A DOCUMENTED STEP, NOT A NEW NUMBER ───────────────────────────────────
 * The headline moves from `SectionHeader`'s scale 1 (32/56px, reserved for the four rails that
 * sell) to scale 2 (30/40px, the support step). That is a deliberate demotion and it is the whole
 * point: the owner wants this to stop shouting like a wall. It is still the only band on the page
 * with a live clock and an orange rule, which is what carries the urgency now.
 */
export const VentesFlashSection = memo(function VentesFlashSection({ products }: VentesFlashSectionProps) {
  /* Gate the countdown on a STABLE value — whether any promo carries an expiration date at all —
     NOT on `> Date.now()`. Under ISR the page is baked minutes before hydration, so a Date.now()
     comparison in render could keep the block on the server and drop it on the client when a promo
     expires inside the cache window → hydration mismatch. The parent already filters to future
     promos, and CountdownDisplay resolves the real time (and returns null once expired) after
     mount. */
  const earliestExpiration = useMemo(() => {
    const validDates = products
      .map((p) => p.promo_expiration_date)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .filter((t) => !Number.isNaN(t));
    if (validDates.length === 0) return null;
    return new Date(Math.min(...validDates));
  }, [products]);

  const maxDiscount = useMemo(() => {
    const discounts: number[] = [];
    for (const p of products) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const oldPrice = Number((p as any).prix ?? (p as any).price ?? 0) || 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newPrice = Number((p as any).promo ?? 0) || 0;
      if (oldPrice <= 0 || newPrice <= 0 || newPrice >= oldPrice) continue;
      const computed = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
      const apiPercent = p.discount_percent ?? p.promo_percent;
      const fromApi = typeof apiPercent === 'number' && Number.isFinite(apiPercent) ? clampDiscount(apiPercent) : 0;
      const percent = clampDiscount(Math.max(computed, fromApi));
      if (percent > 0) discounts.push(percent);
    }
    return discounts.length > 0 ? Math.max(...discounts) : 0;
  }, [products]);

  if (products.length === 0) return null;

  return (
    <Section id="ventes-flash" surface="sunken" spacing="default" width="wide" defer>
      {/* THE PLATE. `border-hairline` for the edge, and one 3px brand rule across the top — the
          cheapest possible way to say "this block is the promotion" without painting a band. It is
          `overflow-hidden` so the rule follows the corner radius. */}
      <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated">
        <div className="h-[3px] w-full bg-brand" aria-hidden="true" />

        {/* ── TWO COLUMNS FROM `lg`, STACKED BELOW IT ────────────────────────────────────────
            The stacked version came first and it was wrong on a wide screen for a reason that is
            arithmetic rather than taste: the catalogue currently carries exactly FOUR products on
            promotion. Four small cards in a full-width rail is ~740px of content in a ~1,400px
            plate — 640px of empty white inside a bordered box, which reads as a failed load.

            Growing the cards to close the gap would undo the thing that was asked for. Putting the
            banner's own identity in that space is what a promotional banner actually does: the
            flame, the title, the clock and the CTA take the left third, the deals take the right.
            Nothing is padding — every element in the left column was already in the header.

            Below `lg` there is no room for two columns and no gap to fill, so it stacks. */}
        <div className="lg:flex lg:items-stretch">
        <div className="flex flex-col gap-3 border-b border-hairline px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 lg:w-[22rem] lg:shrink-0 lg:flex-col lg:items-start lg:justify-center lg:gap-4 lg:border-b-0 lg:border-r lg:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
            {/* THE FLAME PULSES on desktop (owner: "animation with a flash"). CSS keyframes
                (`.pt-flame`, globals.css), NOT framer-motion: a 4-line loop is not worth a ~34 kB
                animation runtime on the LCP path. The rule gates itself to >=1024px and
                `prefers-reduced-motion: no-preference`, so phones get a static flame. */}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10">
              {/* `h-4 w-4`, not `h-4.5`: Tailwind's spacing scale has no 4.5 step, so that class
                  compiles to nothing and the icon silently falls back to its intrinsic size. */}
              <Flame className="pt-flame h-4 w-4 text-brand" aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <span className="pt-kicker block text-brand">Offres limitées</span>
              {/* SectionHeader's scale-2 string. The band hand-rolls its header because of the
                  clock, so this has to be kept in step with the component by hand — it is the
                  same string, not an approximation of it. */}
              <h2 className="mt-1 font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
                Ventes flash
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {earliestExpiration && <CountdownDisplay expirationDate={earliestExpiration} />}

            {/* The CTA was a 52px centred pill below the grid, which cost ~90px of band on its own.
                As a link in the header it is on screen from the moment the banner is — including
                while the rail is being scrolled, which is exactly when someone decides they want
                the full list. `min-h-[44px]` keeps it at the site's tap floor. */}
            <Link
              href="/offres"
              aria-label="Voir toutes les offres et promos"
              className="group inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-hairline px-4 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
            >
              Tout voir
              <ArrowRight
                className="h-4 w-4 transition-transform motion-reduce:transition-none [@media(hover:hover)]:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        {/* ── the rail ───────────────────────────────────────────────────────────────────────
            ONE LAYOUT THAT IS BOTH A ROW AND A SCROLLER, and it is the sizing on the items rather
            than a breakpoint that makes it work:

              grow + basis-[156px]   with room to spare, the cards SHARE it — four deals fill the
                                     rail instead of huddling at the left edge
              max-w-[260px]          …but never grow into the big card this replaced
              min-w-[156px]          and never shrink below legible, so once there are enough
                                     products to exceed the width they overflow and the container
                                     scrolls, with no breakpoint deciding when that happens

            So it is a neat row today with four products and a swipeable rail the day there are ten.

            `snap-x snap-mandatory` makes a swipe land on a card edge. `scrollbar-hide` because a
            scrollbar under the cards reads as a rendering artefact — when the rail does overflow,
            the partial card at the right edge is the affordance. */}
        <div className="scrollbar-hide flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 py-4 sm:px-5 lg:min-w-0 lg:flex-1">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="min-w-[156px] max-w-[260px] grow basis-[156px] snap-start sm:basis-[168px]"
            >
              <FlashDealCard product={product} priority={i < 2} />
            </div>
          ))}
        </div>
        </div>

        {/* The single line of prose the banner keeps, and it is at the BOTTOM because it is
            reassurance rather than a headline. Only rendered when there is a real figure to quote:
            "réductions exceptionnelles" with no number attached is filler. */}
        {maxDiscount > 0 && (
          <p className="border-t border-hairline px-4 py-2.5 text-[11px] text-ink-2 sm:px-5">
            Jusqu&apos;à <span className="font-semibold text-ink-1">−{maxDiscount}%</span> sur une
            sélection de produits, pour une durée limitée.
          </p>
        )}
      </div>
    </Section>
  );
});
