'use client';

import { memo, useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { FlashDealCard } from './FlashDealCard';
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
 * Ventes Flash — a BANNER, and now one you can actually see.
 *
 * ── WHAT THE OWNER REPORTED, AND WHAT WAS ACTUALLY WRONG ───────────────────────────────────
 * *"the banner and the section itself looks so bad background colour and isolation and the design
 * system and responsivity on the mobile looks very bad"* — four complaints, all reproducible, all
 * measured on the live site before anything here changed:
 *
 *   (d) MOBILE WAS BROKEN, NOT JUST UGLY. "Tout voir" sat 50px past the plate's right edge at
 *       320px and 10px at 360px, and the plate was `overflow-hidden`, so the link was silently
 *       sliced off rather than visibly overflowing. The header held an unbreakable 321px run —
 *       countdown pill 174 + gap 12 + CTA 135 — inside a 254px content box. Exactly:
 *       `ctaOverflow = 370 − viewportWidth`, which reproduces +50 / +10 / −20 at 320 / 360 / 390.
 *
 *       The trap: `shrink-0` was NOT the cause and removing it moves nothing. Below `sm` the
 *       container was `flex-col`, so flex-shrink resolves on the VERTICAL axis; CSS never shrinks
 *       content in the cross axis. Dropping `shrink-0` from the pill and the link instead shreds
 *       them to ~90px min-content — a three-line rounded pill, a taller band, on the exact screens
 *       being complained about.
 *
 *   (a)+(b) THE PLATE WAS INVISIBLE. A `bg-elevated` (#FFFFFF) card on a `sunken` (#F7F6F4) band
 *       is 1.06:1, and its `border-hairline` edge is 1.16:1. Neither is a boundary. So the block
 *       that was supposed to say "this is one time-limited offer" said nothing, and 1,376px of
 *       bordered white read as a failed load. That is the whole of "background colour and
 *       isolation", and no amount of tuning inside the plate fixes a 1.06:1 fill.
 *
 *   (c) IT HAND-ROLLED THE DESIGN SYSTEM. Four separate copies of `SectionHeader`'s internals had
 *       drifted here: the h2 string with a stray `mt-1`, a kicker without the leading rule, a
 *       different CTA pill, a different arrow. Meanwhile `SectionHeader.tsx:17` names "Ventes
 *       flash" in the four bands reserved for `scale="1"`, and this one was rendering scale 2 —
 *       the smallest heading of the three adjacent rails, on the band meant to dominate them.
 *
 * ── THE FIX IS MOSTLY DELETION ─────────────────────────────────────────────────────────────
 *   1. THE PLATE IS GONE, and the BAND carries the separation. `border-t-4 border-brand` is
 *      full-bleed at the band boundary: #D03B04 on sand is 4.51:1 light, #FF8A4C on #191A1D is
 *      7.45:1 dark — against 1.16:1 for the hairline it replaces. A band edge is what the rest of
 *      this site uses to separate bands, so this also answers (c).
 *
 *      Verified rather than assumed: `[data-band] { border-top: 1px }` lives in `@layer base` and
 *      lands at byte ~4.8k of the emitted stylesheet, while border utilities land at ~53k. Tailwind
 *      puts utilities in a later layer, so the utility wins on LAYER, not on specificity — no
 *      `!important`, no arbitrary value.
 *
 *      `.pt-slab` on the plate was the obvious alternative and it busts the budget: at 1440 the
 *      plate is 1376x432 ≈ 594k px² of dark against roughly 415k px² of headroom under v6's 12%
 *      ceiling. The pill (~5k px²) is the dark this band is allowed.
 *
 *   2. `SectionHeader` REPLACES THE HAND-ROLLED HEADER, and that is what fixes the clip — not a
 *      patch to it. `SectionHeader.tsx:128` wraps the view-all in `hidden … sm:block`, so the
 *      321px run DOES NOT EXIST below `sm`. The overflow goes to 0 at every width by deletion.
 *      `icon` was written for this band — its own docblock says "e.g. Flame on Ventes flash".
 *
 *   3. THE CARDS FILL THE RAIL. `max-w-[260px]` came off the items. With the 352px left column
 *      gone, four deals divide the full rail instead of huddling at 156px with dead space beside
 *      them — and at 1024-1117px the fourth card was being truncated mid-tile, which is the part
 *      of "isolation looks bad" that is a layout bug rather than a colour.
 *
 * ── WHAT IS DELIBERATELY NOT CHANGED ───────────────────────────────────────────────────────
 * `spacing="default"`, not `feature`. `feature` is `pb-0 pt-6` below `sm` — it would collapse the
 * band's entire bottom gap on a phone — and Section.tsx's own rule is that one page gets at most
 * one `feature` band.
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
      /* ── `tight`, DOWN FROM `default` — AND `feature` IS NOW THE WRONG ANSWER ────────────
         Section.tsx's `feature` step is documented as "reserved for the band that must out-weigh
         its neighbours — Ventes flash, and nothing else". That reservation is now stale and its
         docblock says so: the owner has asked twice for this band to stop behaving like a section.
         `tight` is the support-band step, which is what a banner is. */
      spacing="tight"
      width="wide"
      defer
      aria-labelledby="ventes-flash-heading"
      /* The band's own edge, overriding the 1px `[data-band]` seam. See the note above for why
         this wins on layer order and why the measurement was checked in the emitted CSS. */
      className="border-t-4 border-brand"
    >
      {/* THE KICKER CARRIES THE NUMBER. It used to be an 11px line of prose BELOW the products
          ("Jusqu'à −24% sur une sélection…") — the band's only quantity, set at its smallest size,
          under the fold of its own rail, restating the orange badge already painted on every card.
          In the kicker it is the first thing read, and it costs no row.

          THE COUNTDOWN IS IN THE HEADING ROW, not on a line of its own. That line cost 44px on
          every width, and `trailing` puts the pill inside SectionHeader's existing
          `hidden … sm:flex` guard — so it is mobile-safe by construction rather than by care.

          THE SPOKEN DEADLINE IS RENDERED SEPARATELY, BELOW, and that is not tidiness. `hidden` is
          `display: none`, which removes a subtree from the ACCESSIBILITY TREE as well as from the
          page — so leaving the `sr-only <time>` inside the pill would have silently deleted the
          only machine-readable expiry on every phone. Sighted users would have lost nothing, which
          is exactly why it would never have been noticed.

          `scale="2"`, DOWN FROM 1. Scale 1 is the step for "the rails that sell", and by the
          design system's own list this band was one of them — but the owner has now twice said
          this should read as a banner rather than as a section, and a 56px headline is the single
          loudest thing making it a section. Scale 2 is the documented support step; it is not a
          new number. SectionHeader's own docblock is corrected to match. */}
      <SectionHeader
        id="ventes-flash-heading"
        kicker={maxDiscount > 0 ? `Jusqu'à −${maxDiscount}%` : 'Offres limitées'}
        icon={<Flame className="pt-flame h-4 w-4 text-brand" aria-hidden="true" />}
        title="Ventes flash"
        scale="2"
        viewAllHref="/offres"
        viewAllLabel="Tout voir"
        trailing={earliestExpiration ? <CountdownDisplay expirationDate={earliestExpiration} /> : undefined}
      />

      {earliestExpiration && <FlashDeadline expirationDate={earliestExpiration} />}

      {/* ── the rail ───────────────────────────────────────────────────────────────────────
          ONE LAYOUT THAT IS BOTH A ROW AND A SCROLLER, sized on the items rather than by a
          breakpoint: `grow` + `basis-[156px]` lets four deals share the rail, `min-w-[156px]`
          stops them shrinking below legible, so the day there are ten they overflow and it scrolls
          with nothing deciding when.

          `-mx-4 px-4 … sm:mx-0 sm:px-0` — the scroll container spans the full screen on a phone
          while its content stays on the rail, so a card scrolls out to the edge instead of stopping
          32px short. CategoryRail's own fix.

          `scroll-px-4` matters more than it looks: the snapport is the scrollport's padding box
          reduced by scroll-padding, which was 0, so the snap offsets were 16/184/352… and ZERO WAS
          NOT ONE OF THEM. The first swipe destroyed the left gutter and pulled a card flush to the
          screen edge. A screenshot at rest cannot show that, which is why it survived.

          `snap-proximity` over `mandatory` so the snap does not fight the browser scrolling a
          keyboard-focused card into view. `overscroll-x-contain` stops a swipe chaining into the
          Android/iOS back gesture.

          `<ul role="list">` because the rail's only "there is more" cue is a half-visible card,
          which assistive tech cannot perceive — a list announces its size. `role` is required, not
          belt-and-braces: preflight's `list-style: none` makes Safari+VoiceOver drop list
          semantics. */}
      <ul
        role="list"
        className="scrollbar-hide -mx-4 flex snap-x snap-proximity items-stretch gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {/* ── SIZED FOR A ROW CARD, WHICH IS THE OPPOSITE PROBLEM TO A COLUMN CARD ──────────
            A column card had to be kept NARROW, because its height followed its width and that is
            what made the band a section. A row card has a fixed 64px thumbnail, so its height is
            constant and width costs nothing — it wants to be WIDE enough for a two-line product
            name beside that thumbnail.

            `min-w-[264px]` is the floor, re-derived when the thumbnail grew to 80/96px: 96 + 12
            gap + 48 button + 24 padding + 12 gap = 192px of fixed furniture, leaving ~72px for the
            name at the floor and ~180px at the 400px cap. Below 264 the name clamps to a handful
            of characters and the card starts lying about what it contains.

            `max-w-[400px]`, up from 340: at 1920 four cards now divide the rail EXACTLY
            ((1536−36)/4 = 375), so the 140px of dead rail the 340 cap used to leave is gone. */}
        {products.map((product) => (
          <li
            key={product.id}
            className="min-w-[264px] max-w-[400px] grow basis-[300px] snap-start"
          >
            <FlashDealCard product={product} />
          </li>
        ))}
      </ul>

      {/* THE PHONE GETS ITS OWN ROUTE TO /offres.
          `SectionHeader` correctly hides the view-all below `sm` — that is what makes the clip
          impossible — and for CategoryRail that is the end of it, because its tiles ARE the
          navigation. This rail is different: it hides products behind a swipe, so the way to the
          full list has to exist somewhere. As a full-width bar it is a 48px target where there used
          to be a 0px-wide clipped one.

          `border-rule-strong` (3.10:1 on sand), not `border-hairline` (1.16:1): a ghost button's
          border is its only boundary, so WCAG 1.4.11's 3:1 applies to it.
          `ring-offset-sunken` because Tailwind's default ring-offset is white, which on this sand
          band paints a white gap between the control and its focus ring. */}
      <Link
        href="/offres"
        aria-label="Tout voir les offres flash"
        className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-rule-strong px-5 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-sunken sm:hidden [@media(hover:hover)]:hover:border-brand [@media(hover:hover)]:hover:text-brand"
      >
        Tout voir les offres
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Section>
  );
});
