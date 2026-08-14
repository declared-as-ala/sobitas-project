'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlashDealCard } from './FlashDealCard';
import { ProductGrid } from './ProductGrid';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
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
 * Below this, the pill counts down. Above it, the pill states a date and nothing ticks.
 *
 * ── WHY A THRESHOLD AT ALL ─────────────────────────────────────────────────────────────────
 * Owner, looking at the live band: the clock read **"FIN DANS 27J 13:08:14"**. A seconds-precision
 * countdown to a deadline four weeks out is not urgency, it is a clock that says "no rush" — it
 * spends the band's one scarce signal on a number nobody can act on. Worse, it was ALSO the widest
 * element in the row that overflowed on a phone (174px of a 321px run), so the credibility problem
 * and the layout problem were the same problem.
 *
 * 48h is the point where a person can still act differently because of the clock. Above it the
 * honest statement is a date; below it, seconds genuinely matter.
 *
 * The second win is that above the threshold NOTHING IS SCHEDULED. The old code ran
 * `setInterval(…, 1000)` forever, on every visitor, re-rendering a text node once a second to
 * animate a digit that `globals.css` only animates at >=1024px anyway — on a page with a measured
 * 419ms INP. `content-visibility: auto` skips paint, not JavaScript, so it ran before the band was
 * ever scrolled to.
 */
const LIVE_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * The clock, as ONE inline pill — a live countdown inside 48h, a plain date outside it.
 *
 * ── THE BLACK IS STILL SPENT HERE AND NOWHERE ELSE ─────────────────────────────────────────
 * With the plate gone (see the band's note) this pill is the band's only dark surface: ~175x28px,
 * about 5k px², which is inside the allowance tokens.css reserves for it. `.pt-slab` scopes it, so
 * `text-brand` resolves to #FF8A4C — 8.14:1 on the near-black — and `text-ink-3` to the slab's own
 * muted ink. Correct in both themes with no `dark:` class.
 *
 * ── `.pt-tick` IS GONE ─────────────────────────────────────────────────────────────────────
 * The seconds digit used to pulse. Its trough is `opacity: .45` held by `steps(1, end)`, which puts
 * the digit at roughly 2.5:1 for about a fifth of every second — a text contrast failure that
 * arrives and leaves 60 times a minute, plus an SC 2.2.2 (Pause/Stop/Hide) exposure for something
 * that cannot be paused. Raising the trough until it passes AA leaves no visible animation, so the
 * honest resolution is to drop it. This was its only consumer.
 *
 * ── THE ACCESSIBILITY CONTRACT IS UNCHANGED ────────────────────────────────────────────────
 * Live digits are either a screen-reader firehose (with aria-live) or an unlabelled cluster of
 * numbers a user lands on mid-count (without it). The pill stays `aria-hidden` and one static
 * sentence carries the same information as an absolute date, announced once.
 */
const CountdownDisplay = memo(function CountdownDisplay({ expirationDate }: { expirationDate: Date }) {
  /* Starts null: computing the real remaining time needs Date.now(), which differs between the
     server render and the client. A neutral start is deterministic on both sides — and because
     `live` is derived from it, BOTH sides render the static date, so the static branch is not a
     hydration risk either. */
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  useEffect(() => {
    const update = () => {
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
    update();
    // Outside the live window the pill is a static date, so there is nothing to schedule.
    if (expirationDate.getTime() - Date.now() > LIVE_WINDOW_MS) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expirationDate]);

  /* An expired promo used to return null — the pill vanished from the accessibility tree while
     discounted cards carried on rendering underneath it. A sentence is the honest end state. */
  if (countdown?.isExpired) return <span className="sr-only">Cette offre est terminée.</span>;

  const pad = (n: number) => String(n).padStart(2, '0');
  const live = countdown != null && countdown.days < 2;

  /* `timeZone` is PINNED on both formats. Without it the server formats in the container's UTC and
     the browser in the visitor's zone, so any promo expiring near midnight renders a different date
     on each side — a hydration mismatch of exactly the kind the `Date.now()` note above avoids. */
  const dateLabel = expirationDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Tunis',
  });

  /* The PILL ONLY. The spoken sentence is `<FlashDeadline>` below, rendered by the band outside
     the header's `hidden … sm:flex` slot — see the note at the call site. */
  return (
    <span
      className="pt-slab inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5"
      aria-hidden="true"
    >
      <Clock className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
        {live ? 'Fin dans' : 'Jusqu’au'}
      </span>
      <span className="font-display text-sm font-bold tabular-nums leading-none text-brand">
        {live && countdown
          ? `${countdown.days > 0 ? `${countdown.days}J ` : ''}${pad(countdown.hours)}:${pad(
              countdown.minutes
            )}:${pad(countdown.seconds)}`
          : dateLabel}
      </span>
    </span>
  );
});

/**
 * The deadline as one announced sentence, at every width.
 *
 * Separate from the pill because the pill lives in a `hidden … sm:flex` slot, and `display: none`
 * takes a subtree out of the accessibility tree as well as off the screen. Kept as a `<time>` with
 * a machine-readable `dateTime`, and the timezone is PINNED — without it the server formats in the
 * container's UTC and the browser in the visitor's zone, so a promo expiring near midnight renders
 * a different date on each side and React logs a hydration mismatch.
 */
function FlashDeadline({ expirationDate }: { expirationDate: Date }) {
  return (
    <span className="sr-only">
      Offre valable jusqu&apos;au{' '}
      <time dateTime={expirationDate.toISOString()}>
        {expirationDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'Africa/Tunis',
        })}
      </time>
    </span>
  );
}

interface VentesFlashSectionProps {
  products: FlashProduct[];
}

/**
 * Ventes Flash — the same parts as every other band on the landing page.
 *
 * ── THE ASK, AND WHAT IT COST TO IGNORE IT ────────────────────────────────────────────────
 * Owner, 13/08/2026: *"redesign the vente flash section to be kinda uniform with the landing
 * page."* This band had been redesigned four times before that, each time by adding something —
 * a dark slab, then a plate, then a wash, then a hatch — and each pass moved it further from the
 * page it lives on. The whole of this pass is subtraction.
 *
 * `scripts/measure-flash.mjs` had been asserting the truth the entire time. Run against
 * production before anything here changed, 12 widths x 2 themes:
 *
 *     width   bandH   screens   cardW   cardH   edge
 *       280    1244     1.38      214     254    1px
 *       360    1227     1.36      294     254    1px
 *       390    1227     1.36      324     254    1px     <- the phone most of the traffic uses
 *       430     733     0.81      177     254    1px
 *      1024     386     0.43      219     181    1px
 *      1440     328     0.36      323     122    1px
 *
 * 24 of 24 edge checks failing, and every width over the height ceiling. The band the owner asked
 * THREE separate times to make smaller than a section measured 1.36 viewport heights on a phone.
 * Nothing ran the guard, so nothing said so — the same reason every other defect found this week
 * survived for days, and why `health-watch.yml` now exists.
 *
 * ── WHAT WAS ACTUALLY DIFFERENT ABOUT THIS BAND ───────────────────────────────────────────
 * Three things, and all three are now gone:
 *
 *   1. AN INNER PANEL NOTHING ELSE HAS. `rounded-3xl border border-brand/25 bg-elevated
 *      shadow-lg`, over a brand gradient wash and a 135deg hatch.
 *      `grep -rn rounded-3xl src/app/components` returns exactly one line and it was this one.
 *      Only `shadow-lg`, only textured surface, only nested frame on the page. Not a matter of
 *      taste: it was unique, and unique is what "doesn't look like the rest" means.
 *
 *   2. A CARD THAT WAS ProductCard'S EXACT INVERSE. ProductCard is `flex-row sm:flex-col`;
 *      FlashDealCard was `flex-col sm:flex-row`. On a phone the rail above showed row cards and
 *      this band showed columns; from `sm` they swapped. Two adjacent bands rendering the same
 *      kind of object in opposite shapes at every single width. See FlashDealCard for the fix and
 *      for why a column card is what made the phone band 1,227px.
 *
 *   3. A FORKED GRID. `grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-4`,
 *      missing the `md` step — so at 768-1023px this band showed two columns while the identical
 *      rail above it showed three. It was forked because `ProductGrid` could only render a
 *      `<div>` and this band wants list semantics; `ProductGrid` now takes `as`/`role`, which
 *      removes the reason to fork rather than just the fork.
 *
 * ── WHAT IS DELIBERATELY KEPT ─────────────────────────────────────────────────────────────
 * `scale="2"`. SectionHeader reserves scale 1 to the three rails that sell and names this band as
 * the documented scale-2 case. Uniform means built from the same parts, not shouting at the same
 * volume — the urgency comes from the 4px brand edge, the flame, the `Jusqu\'a -24%` kicker and
 * the live clock.
 *
 * The COUNTDOWN PILL stays the band's one dark surface (~5k px2, `.pt-slab`, on tokens.css's
 * allowed list by name). The plate was 1376x432 = 594k px2 of dark against ~415k px2 of headroom
 * under the 12% ceiling — 1.4x the entire remaining budget on its own, which is the arithmetic
 * that should have stopped it shipping the first time.
 *
 * `spacing="default"`, never `feature`: Section.tsx allows one `feature` band per page and this
 * band gave that step up when it stopped being a section.
 */
export const VentesFlashSection = memo(function VentesFlashSection({ products }: VentesFlashSectionProps) {
  /* Gate the countdown on a STABLE value — whether any promo carries an expiration date at all —
     NOT on `> Date.now()`. Under ISR the page is baked minutes before hydration, so a Date.now()
     comparison in render could keep the block on the server and drop it on the client when a promo
     expires inside the cache window. */
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
    <Section
      id="ventes-flash"
      surface="sunken"
      /* ── `default`, THE SAME STEP AS EVERY OTHER PRODUCT BAND ────────────────────
         `tight` was the support-band step, chosen when this band was a banner wrapped in its own
         panel. With the panel gone it is a product grid on a sand surface, which is the exact
         thing `default` is documented as being for — and on a phone `default` is SMALLER
         (`pt-4` against `tight`'s `pt-6`), so uniformity costs nothing here. */
      spacing="default"
      width="wide"
      /* ── THE BRAND EDGE IS BACK, AND IT WAS FAILING ITS OWN GUARD ──────────────────
         `measure-flash.mjs` asserts `borderTopWidth === "4px"` on this band. Measured against
         production on 14/08/2026 it was 1px at all twelve widths in BOTH themes — 24 of 24
         checks failing — because the plate below replaced the edge and nothing ever re-ran the
         guard.

         The edge is how every other boundary on this site separates two bands, so restoring it
         is the uniform answer as well as the passing one: #D03B04 on sand is 4.51:1 light,
         #FF8A4C on #191A1D is 7.45:1 dark, against 1.16:1 for the hairline it replaced.

         It wins over `[data-band]`'s 1px seam on LAYER, not specificity: the seam lives in
         `@layer base` and Tailwind emits utilities later. No `!important`, no arbitrary value. */
      className="border-t-4 border-brand"
      defer
      aria-labelledby="ventes-flash-heading"
    >
      {/* ── THE PLATE IS GONE, AND IT WAS THE WHOLE OF "NOT UNIFORM" ────────────────
          Owner, 13/08/2026: "redesign the vente flash section to be kinda uniform with the
          landing page."

          What sat here was `rounded-3xl border border-brand/25 bg-elevated shadow-lg` over a
          brand gradient wash and a 135deg hatch. `grep -rn rounded-3xl src/app/components`
          returns ONE line and it was this one: the band was the only inner panel anywhere in the
          component tree, the only `shadow-lg`, the only textured surface. Not "slightly
          different" — unique. Nobody needs to know the design system to see that one band is
          wearing a costume.

          It cost more than it looked, too. The panel's own `px-4 py-5` sat INSIDE the band's
          padding, so the band paid for two frames; `overflow-hidden` on it is what let the
          earlier clipped-CTA bug hide from a guard that was watching for spill; and the wash and
          the hatch are two more full-size composited layers on a band that already lazy-loads
          four packshots.

          Everything it was carrying is carried by parts the rest of the page already uses: the
          separation by the 4px brand edge above, the urgency by the flame, the `Jusqu'a -24%`
          kicker, the live clock, and the orange badge already painted on every card. */}
      <SectionHeader
        id="ventes-flash-heading"
        kicker={maxDiscount > 0 ? `Jusqu'à −${maxDiscount}%` : 'Offres limitées'}
        icon={<Flame className="pt-flame h-4 w-4 text-brand" aria-hidden="true" />}
        title="Ventes flash"
        /* `scale="2"` IS DELIBERATE AND HAD TO SURVIVE THIS PASS. SectionHeader reserves scale 1
           to the three rails that sell and names this band as the documented scale-2 case: it
           keeps its urgency from the brand edge and the live clock, not from type size. Uniform
           means built from the same parts, not shouting at the same volume. */
        scale="2"
        viewAllHref="/offres"
        viewAllLabel="Tout voir"
        trailing={earliestExpiration ? <CountdownDisplay expirationDate={earliestExpiration} /> : undefined}
      />

      {/* `hidden` is `display: none`, which removes a subtree from the ACCESSIBILITY TREE as well
          as from the page — and the countdown pill above lives inside SectionHeader's
          `hidden ... sm:flex` guard. The spoken deadline is therefore rendered here, outside it,
          or every phone would silently lose the only machine-readable expiry on the band. */}
      {earliestExpiration && <FlashDeadline expirationDate={earliestExpiration} />}

      {/* ── THE CANONICAL GRID, NOT A FOURTH COPY OF IT ─────────────────────────
          This was `grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 sm:gap-3 lg:grid-cols-4`, hand
          rolled because `ProductGrid` could only render a `<div>` and this band wants list
          semantics. Every difference in that string turned out to be a defect rather than a
          decision:

            no `md` step   768-1023px showed TWO columns while the identical rail directly above
                           it showed three.
            `min-[420px]`  a breakpoint on no scale, so below it four cards stacked one-up and
                           the band measured 1,227px at 390px — 1.36 viewport heights.
            `gap-2.5`      10px, on no lattice, against the grid's 12/16/24.

          `ProductGrid` now takes `as`/`role`, so the list semantics cost no fork. `role` is not
          belt-and-braces: preflight's `list-style: none` makes Safari+VoiceOver drop list
          semantics, and a rail whose only "there is more" cue is visual needs its size spoken. */}
      <ProductGrid
        /* ── TWO COLUMNS THROUGH THE MIDDLE, AND THIS IS THE ONE PLACE THE GRID DIVERGES ──
           Measured on the local production build, using ProductGrid's own steps unmodified:

               768px   3 columns -> card 229px wide, 181px tall, band 522px
              1024px   4 columns -> card 222px wide, 181px tall, band 355px
              1280px   4 columns -> card 286px wide, 122px tall, band 297px

           122px is the row card's natural height. 181px is it FAILING: below ~264px of card there
           is no room for a name beside a 96px thumbnail and a 48px control, so the title takes its
           second line AND the price row wraps the struck-through original onto the badge. 768px is
           worse still, because four items in a three-column grid also leave an orphan row.

           So the column count is chosen on the card's minimum width rather than copied: 1 -> 2 -> 2
           -> 4. Every card is at least 286px at every width, and nothing wraps. `cn` is
           tailwind-merge, so these three replace the matching steps and `sm:grid-cols-2`, the gaps
           and the base column all still come from ProductGrid.

           This is a real divergence from the rails and it is the only one. It exists because this
           band's card is a row and theirs is a column, which is what keeps this band a banner —
           a row card simply does not fit four-across in a 950px container, and the honest way to
           say that is in the column count rather than by letting the text break. */
        className="md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4"
        as="ul"
        role="list"
      >
        {products.map((product) => (
          <li key={product.id}>
            <FlashDealCard product={product} />
          </li>
        ))}
      </ProductGrid>

      {/* THE PHONE GETS ITS OWN ROUTE TO /offres.
          `SectionHeader` hides the view-all below `sm` — that is what makes the old clipped-CTA
          bug impossible by construction — so without this bar there is no way to the full promo
          list from a phone at all. `measure-flash` asserts EXACTLY ONE visible `/offres` link at
          every width, because two controls hiding on opposite sides of one breakpoint is the
          arrangement where a mistuned breakpoint leaves some width with neither.

          `border-rule-strong` is 3:1 — a ghost button's border is its only boundary and WCAG
          1.4.11 applies to it. It resolves in page scope now that the dark panel is gone. */}
      <Link
        href="/offres"
        aria-label="Tout voir les offres flash"
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-rule-strong px-5 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:hidden [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
      >
        Tout voir les offres
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Section>
  );
});
