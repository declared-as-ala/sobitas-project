'use client';

import { memo, useMemo, useEffect, useRef, useState } from 'react';
import { FlashDealCard } from './FlashDealCard';
import { ProductGrid } from './ProductGrid';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Clock, Flame } from 'lucide-react';

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
 * How far outside the viewport the strip starts ticking.
 *
 * ── WHAT THIS REPLACED, AND WHY THE REPLACEMENT IS THE BETTER SHAPE ────────────────────────
 * There used to be a 48-HOUR threshold here: inside it the clock ticked once a second, outside it
 * the seconds tile disappeared and the interval dropped to 30s. It was doing two jobs at once — a
 * design judgement (a seconds counter on a four-week deadline is a clock that says *no rush*) and
 * a performance one (this band is ~1,500px down a page with a measured 419ms INP, and
 * `content-visibility: auto` skips PAINT, not JavaScript, so the old `setInterval` ran on every
 * visitor from first paint whether or not they ever scrolled here).
 *
 * The owner has overruled the design half — *"for the ventes flash add seconds"* — and once the
 * seconds tile is permanent, a 30s tick is simply a wrong clock, so the threshold has nothing left
 * to decide. The performance half is real regardless of the deadline, and an IntersectionObserver
 * answers it directly rather than by proxy: nothing is scheduled until the strip is near the
 * screen, and the interval is torn down again when it leaves.
 *
 * 200px of margin so the first visible tick is already correct rather than arriving a beat after
 * the band appears.
 */
const TICK_ROOT_MARGIN = '200px';

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

  /* `ticking` gates the interval, NOT the first computation — see the two effects below. */
  const stripRef = useRef<HTMLDivElement>(null);
  const [ticking, setTicking] = useState(false);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    /* No observer (very old browser, or a test environment): tick rather than freeze. A clock that
       never moves is a worse failure than one that costs a re-render a second. */
    if (typeof IntersectionObserver === 'undefined') {
      setTicking(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setTicking(entries.some((e) => e.isIntersecting)),
      { rootMargin: TICK_ROOT_MARGIN }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    /* ALWAYS compute once, even off screen. Without this the tiles would render `––` until the
       band scrolled into view, and on a phone that is a visible flash of placeholder digits inside
       the element whose entire job is to look live. */
    update();
    if (!ticking) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expirationDate, ticking]);

  /* An expired promo used to return null — the pill vanished from the accessibility tree while
     discounted cards carried on rendering underneath it. A sentence is the honest end state. */
  if (countdown?.isExpired) return <span className="sr-only">Cette offre est terminée.</span>;

  const pad = (n: number) => String(n).padStart(2, '0');

  /* `timeZone` is PINNED on both formats. Without it the server formats in the container's UTC and
     the browser in the visitor's zone, so any promo expiring near midnight renders a different date
     on each side — a hydration mismatch of exactly the kind the `Date.now()` note above avoids. */
  const dateLabel = expirationDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Tunis',
  });

  /* ── THE CLOCK AS SEGMENTED TILES (owner, 15/08/2026: "add urgency countdown in a good
     stylish way") ────────────────────────────────────────────────────────────────────────────
     What was here was one inline pill printing `27J 13:08:14` as a single run of text. Two
     problems, and the owner has now named both of them across two sessions:

       IT DID NOT READ AS URGENCY. A long unbroken numeric string is a timestamp; people read
       timestamps as information, not as pressure. Segmenting it into labelled tiles is what makes
       a clock feel like a deadline — each unit gets its own object, and the eye lands on the
       smallest one that is still moving.

       IT WAS INVISIBLE ON A PHONE. The pill was passed to `SectionHeader`'s `trailing` slot,
       which is `hidden … sm:flex`. Most of this site's traffic is mobile, so the urgency device
       was hidden from the majority of the people it exists for. The tiles are rendered by the band
       itself, at every width — see the call site.

     ── WHAT STILL DOES NOT TICK, AND WHY THAT SURVIVED THE REDESIGN ──────────────────────────
     `live` is unchanged: inside 48h the seconds tile is present and `setInterval` runs at 1s;
     outside it there is no seconds tile and the interval runs at 30s. That rule came from the
     owner's own earlier objection — "FIN DANS 27J 13:08:14" is a clock that says *no rush* — and
     it is also what keeps a 1s re-render off a page with a measured 419ms INP. A deadline three
     weeks out now shows JOURS / HEURES / MIN, which is honest and still visibly a countdown.

     `aria-hidden` on the whole strip. Live digits are either a screen-reader firehose (with
     aria-live) or an unlabelled cluster of numbers a user lands on mid-count (without it).
     `<FlashDeadline>` carries the same information as one absolute date, announced once. */
  /* ── SECONDS AT EVERY DISTANCE (owner, 18/08/2026: "for the ventes flash add seconds") ──
     This tile used to appear only inside 48h, and the reasoning above still stands as a design
     argument: a seconds counter on a deadline four weeks out is a clock that says *no rush*. The
     owner has weighed that and asked for the seconds anyway, which is theirs to decide — a moving
     digit is what makes a countdown read as live at a glance, and that is worth more to them than
     the precision argument.

     What does NOT come back is the old cost. The 1s interval that used to run on every visitor
     from first paint now runs only while the strip is actually on screen (see the observer in the
     effect above): a band 1,500px down a page with a measured 419ms INP should not be scheduling
     a re-render a second for a reader who never scrolls to it. `live` is therefore no longer about
     the seconds tile at all — it only chooses the tick RATE, and the far branch keeps a 1s tick
     now because a seconds tile that updates every 30s would simply be wrong. */
  const segments: Array<{ value: number; label: string }> = [];
  if (!countdown || countdown.days > 0) segments.push({ value: countdown?.days ?? 0, label: 'Jours' });
  segments.push({ value: countdown?.hours ?? 0, label: 'Heures' });
  segments.push({ value: countdown?.minutes ?? 0, label: 'Min' });
  segments.push({ value: countdown?.seconds ?? 0, label: 'Sec' });

  return (
    /* ── THE LABEL STACKS BELOW `sm`, AND THAT NUMBER WAS MEASURED ───────────────────────────
       `measure-flash.mjs` failed the first version of this strip at 280px in both themes:
       "1 element(s) overflow their own box". The arithmetic, at the narrowest viewport in real
       traffic (a 320px phone at Android's largest display-size setting reports ~280 CSS px):

           content box                    248px
           "Se termine dans" + clock     ~110px
           three 44px tiles               132px
           two colons + four gaps         ~28px
                                          ────
                                          270px   → 22px over

       Stacking the label onto its own line leaves the tiles 160px of a 248px box. Below `sm` the
       whole strip is centred, which matches the two-up rail above it; from `sm` it is one row on
       the same left rail as the heading. */
    <div
      ref={stripRef}
      className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-3"
      aria-hidden="true"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        <Clock className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        {/* ALWAYS THE DURATION PHRASING, because the tiles are always a duration now.
            This read `live ? 'Se termine dans' : 'Jusqu’au'`, which was correct while the far
            branch printed a DATE. It no longer does, so production rendered

                JUSQU’AU  19 JOURS : 04 HEURES : 46 MIN

            — "until the 19 days", a preposition pointing at an interval. Caught by reading the
            deployed strip rather than the code: the label and the tiles are two branches that
            were changed at different times, and only the rendered string shows them disagreeing.
            The absolute date is still available on the `title` below. */}
        Se termine dans
      </span>

      {/* TILES AT EVERY DISTANCE, seconds included. The old code swapped to a bare date string
          three weeks out, which is why a phone screenshot of this band showed no clock at all, and
          then showed JOURS/HEURES/MIN with no moving digit. The `title` carries the absolute date
          for anyone hovering, and <FlashDeadline> announces it once for anyone listening. */}
      <div className="flex items-center gap-1 sm:gap-1.5" title={`Jusqu’au ${dateLabel}`}>
        {segments.map((seg, i) => (
          <div key={seg.label} className="flex items-center gap-1 sm:gap-1.5">
            {/* `min-w-[2.75rem]` so the tile does not resize when 9 becomes 10 — a countdown that
                reflows its neighbours once a second is the jitteriest thing on a page.
                `tabular-nums` does the same job for the digits inside it. */}
            {/* ── 44px TILES, AND THE FOURTH ONE FITS ────────────────────────────────────
                A seconds tile joined this row on 18/08. Re-measured rather than assumed, because
                the previous note in this file got the budget wrong and shrank the tiles for no
                reason: four 44px tiles, three 5px separators and the gaps between them come to
                ~215px, against a 288px content box at 320px — the narrowest viewport in real
                traffic. The row was never tight; the label stacks onto its own line below `sm`,
                which is what actually bought the space (see the wrapper).

                `min-w`, not `w`: the tile must not resize when 9 becomes 10, or the clock reflows
                its own neighbours once a second. `tabular-nums` does the same job for the digits. */}
            <div className="pt-slab flex min-w-[2.75rem] flex-col items-center rounded-lg px-1.5 py-1.5">
              <span className="font-display text-base font-bold tabular-nums leading-none text-brand sm:text-lg">
                {countdown ? pad(seg.value) : '––'}
              </span>
              {/* 9px, and it is the ONE place on the site left under 11px after the 18/08 sweep.
                  It is a deliberate exception rather than a straggler: this is a unit label under a
                  numeral, the whole strip is `aria-hidden`, and the same information is announced
                  once as a full sentence by <FlashDeadline>. Raising it to 11px needs a 52px tile
                  to fit "HEURES", which is a 60px-wider clock to make a caption legible that
                  nobody reads as text. */}
              <span className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wider text-ink-3">
                {seg.label}
              </span>
            </div>
            {/* No separator after the last tile: a trailing colon reads as a truncated value. */}
            {i < segments.length - 1 && (
              <span className="font-display text-sm font-bold leading-none text-ink-3">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
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
      /* ── NO BRAND EDGE (owner, 15/08/2026: "for the vente flash, take off the border top") ──
         The 4px rule was restored one session earlier because `measure-flash.mjs` asserted it and
         had been failing 24/24 — the guard was right that the band and its guard disagreed, and
         the disagreement was resolved in the guard's favour. The owner has now resolved it the
         other way, which is theirs to do.

         The band does not lose its boundary: `[data-band]` in `@layer base` still paints the 1px
         seam every other band boundary on this site uses, and this band's `surface="sunken"`
         already changes the ground colour against the white section above it. What it loses is the
         one decoration that made it louder than its neighbours — which is the same direction every
         other change to this band has gone (the slab, the plate, the wash, the hatch, the CTA).

         `measure-flash.mjs` is updated in the same commit. Leaving a guard asserting a removed
         design is how `measure-flash` came to fail for days while a real regression hid behind
         the noise. */
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
        /* ── NO "TOUT VOIR" (owner, 15/08/2026) ────────────────────────────────────────────
           *"take off the button from the vente flash — means that a section for show, no CTA in
           it … even in the desktop."*

           Both routes to /offres are gone: this `viewAllHref` (desktop, in the header row) and the
           full-width bar that used to sit under the grid on phones. They were a matched pair —
           `SectionHeader` hides its view-all below `sm`, so the bar existed only to cover the
           width where the header link was not rendered.

           The band is not orphaned by this. Every card is a link to its product, /offres is in the
           footer and reachable from the boutique nav, and this band's job is now what its name says
           — showing what is discounted right now. Three consecutive bands each carrying a
           "Tout voir" is what made the page read as a list of shops rather than one shop. */
      />

      {/* ── THE CLOCK IS A ROW OF THE BAND NOW, NOT A SLOT IN THE HEADER ─────────────────────
          It used to be passed as `trailing`, and `SectionHeader` renders that slot inside a
          `hidden … sm:flex` group. `display: none` removes a subtree from the page AND from the
          accessibility tree, so on every phone — the majority of this site's traffic — the urgency
          device simply did not exist. The owner's screenshot of the mobile band shows a heading, a
          kicker and four cards, and no clock anywhere.

          Given its own row it is visible at every width and has room to be a real object rather
          than a pill squeezed beside a "Tout voir" link. `justify-center` below `sm` matches the
          centred composition the two-up rail above already uses; from `sm` it sits on the same
          left rail as the heading.

          `mt-4 sm:mt-5` and nothing more: the header already owns its own bottom margin, and the
          grid below owns its top. Adding a third value here is how a band ends up with 60px of
          dead space nobody chose. */}
      {earliestExpiration && (
        <div className="mt-4 flex justify-center sm:mt-5 sm:justify-start">
          <CountdownDisplay expirationDate={earliestExpiration} />
        </div>
      )}

      {/* The spoken deadline, once, as an absolute date. Separate from the strip above because
          that strip is `aria-hidden` — live digits are either a screen-reader firehose (with
          aria-live) or an unlabelled cluster of numbers landed on mid-count (without it). */}
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

      {/* THE PHONE'S "TOUT VOIR LES OFFRES" BAR IS GONE WITH ITS DESKTOP TWIN.
          It existed only because `SectionHeader` hides its view-all below `sm`, so the two were
          one control rendered at complementary widths. Removing one and keeping the other would
          have left a CTA on phones and none on desktop — the opposite of uniform, and the exact
          shape of bug `measure-flash`'s "exactly one visible /offres link" assertion was written
          to catch. That assertion now expects ZERO; see the note beside it. */}
    </Section>
  );
});
