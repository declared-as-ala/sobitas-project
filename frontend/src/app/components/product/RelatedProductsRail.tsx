'use client';

/**
 * The "Produits similaires" rail — a scroller with real arrows, on every width.
 *
 * ── WHAT IT REPLACES, AND WHY ───────────────────────────────────────────────────────────────
 * The foot of the product page carried `flex md:grid … md:grid-cols-4`: a snap carousel on phones
 * that became a static four-up grid from `md`. Two behaviours out of one element, styled twice,
 * and they had already drifted — the grid put four cards across a 768px tablet at 172px each,
 * which is narrower than the same card gets on a 390px phone.
 *
 * MEASURED BEFORE CLAIMING ANYTHING: `GET /similar_products/{sub}` returns exactly four products,
 * or none. So this rail is NOT recovering suggestions the grid was hiding — at four items it
 * renders the same four-up row the grid did, pixel for pixel, and on today's data the chevrons
 * below never appear at all. That is worth stating plainly, because the obvious story ("a carousel
 * shows more than a grid") is the wrong one here and would be quoted back later as a reason.
 *
 * What it buys is one behaviour instead of two: one width rule, one set of styles, and a rail that
 * is already correct on the day the API returns six. Three across at `md` rather than four is the
 * one visible change, and it is the one the old grid got wrong.
 *
 * ── THE ARROWS ARE STATEFUL, NOT DECORATIVE ─────────────────────────────────────────────────
 * An arrow that is always drawn and sometimes does nothing teaches people to stop pressing arrows.
 * These disable at each end, and the whole control does not render when everything already fits —
 * which, per the paragraph above, is every product page on the site today.
 *
 * ── RTL ─────────────────────────────────────────────────────────────────────────────────────
 * The site serves Arabic pages and the design system is written in logical properties throughout,
 * so this must not assume `scrollLeft` grows to the right. `scrollBy({ left: … })` is resolved
 * against the writing direction by the browser, and the end-detection below compares ABSOLUTE
 * offsets, which is the one formulation that holds in both directions across engines (WebKit once
 * counted RTL scrollLeft downward from zero, Blink counted it negative).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/app/components/ProductCard';
import type { Product } from '@/types';
import { cn } from '@/app/components/ui/utils';

export function RelatedProductsRail({ products }: { products: Product[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const offset = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(offset <= 2);
    /* 2px of slack: sub-pixel layout means a fully scrolled rail rarely lands exactly on `max`,
       and an arrow that stays enabled at the end is the defect this state exists to prevent. */
    setAtEnd(max <= 2 || offset >= max - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = scroller.current;
    if (!el) return;
    /* `passive`: this fires on every frame of a flick and must never be able to block the scroll
       it is observing. A ResizeObserver rather than a window resize listener, because the rail also
       changes width when the sticky bar or a sheet appears. */
    el.addEventListener('scroll', sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', sync);
      ro.disconnect();
    };
  }, [sync, products.length]);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    /* 0.9 of a viewport rather than 1: a sliver of the previous card stays on screen, which is what
       tells a reader the rail moved rather than re-rendered. */
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const canPage = !(atStart && atEnd);

  return (
    <div className="relative">
      <div
        ref={scroller}
        /*
          ── A LIST ON A PHONE, A RAIL FROM `sm` ─────────────────────────────────────────────
          Owner, 17/08/2026: *"on the mobile the similar products, put them one under one, no need
          for scroll left and right — or if you want to keep it scroll, change the design of the
          card"*.

          Stacked, and for a reason beyond preference. `ProductCard` is `flex-row` on a phone — a
          124px thumbnail beside its text — so ONE card already fills the width of the screen. A
          horizontal scroller of full-width horizontal cards is a carousel whose viewport holds
          exactly one item: every product after the first is invisible until swiped, on the block
          whose entire job is to show a reader what else there is. Four stacked rows are 180px
          each; all four are on the page, and the reader scrolls the way they were already
          scrolling.

          From `sm` the card is a column again, four fit across, and the rail with its chevrons is
          the right shape. ONE element either way — a `grid` that becomes a `flex` — because two
          elements is how the two hero trees started.

          The negative margins let the rail bleed to the screen edge from `sm`, where a card clipped
          by the viewport edge is the affordance that says "this scrolls"; inside the content rail
          from `lg`, where the arrows do that job instead.
        */
        className="scrollbar-hide grid grid-cols-1 gap-3 sm:-mx-6 sm:flex sm:snap-x sm:snap-mandatory sm:gap-4 sm:overflow-x-auto sm:px-6 sm:pb-2 lg:mx-0 lg:gap-6 lg:px-0"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((product, index) => (
          <div
            key={product.id || `similar-${index}`}
            /*
              -- THE WIDTH IS SET BY THE CARD, NOT BY HOW MANY FIT ------------------------------
              `ProductCard` is `flex-row sm:flex-col`: on a phone it is deliberately a HORIZONTAL
              card, a 124px thumbnail beside its text, because a vertical card one-per-row is ~500px
              tall and a horizontal one is ~180px. This rail once handed that card a
              `min(180px, 42vw)` box — 164px on a 390px phone, of which the thumbnail alone takes
              124 — and the result was not an unresponsive card but a BROKEN one: packshot left, a
              clipped "25", half a discount pill, and no product name at all. `w-full` inside the
              phone grid is what the card was always built for.

              `calc((100% - 4.5rem) / 4)` at `lg` is four cards and three 24px gaps EXACTLY, so with
              the four products the API returns this row is indistinguishable from the grid it
              replaces and there is nothing to scroll. Invisible today, correct tomorrow.
            */
            className="w-full shrink-0 snap-start sm:w-[200px] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4.5rem)/4)]"
          >
            <ProductCard product={product} variant="compact" />
          </div>
        ))}
      </div>

      {canPage && (
        <>
          <RailArrow side="start" disabled={atStart} onClick={() => page(-1)} />
          <RailArrow side="end" disabled={atEnd} onClick={() => page(1)} />
        </>
      )}
    </div>
  );
}

/**
 * Desktop only. On a touch screen the rail is already swipeable and an arrow would sit on top of a
 * product card, covering the thing it is trying to sell.
 */
function RailArrow({
  side,
  disabled,
  onClick,
}: {
  side: 'start' | 'end';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'start' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'start' ? 'Produits précédents' : 'Produits suivants'}
      className={cn(
        'absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-elevated text-ink-2 shadow-card transition-opacity hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus lg:flex',
        side === 'start' ? '-start-5' : '-end-5',
        disabled && 'pointer-events-none opacity-0'
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
