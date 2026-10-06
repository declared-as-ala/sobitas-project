'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Search, X } from 'lucide-react';
import { useLoading } from '@/contexts/LoadingContext';
import type { DirectoryEntry } from './brandEntries';

/**
 * The A–Z directory: 577 brands, every one of them a crawlable link, on a page that used to be
 * 40,207px tall to say the same thing.
 *
 * ── WHY THIS IS A TEXT INDEX AND NOT A LOGO WALL ───────────────────────────────────────────
 * Owner, 19/08/2026, with a full-page screenshot: *"the brands page looks glorious, disgusting …
 * looks some kind of a bad thing. There is a lot of white space."*
 *
 * The measurement behind that reaction, taken before anything was changed:
 *
 *     document height        81,851px at 390   ·   40,207px at 1536
 *     content rail           1,024px inside a 1,536px viewport (67%)
 *     DOM nodes              11,952
 *     brands with a logo     57 of 589 — 9.7%
 *
 * So the page rendered 589 aspect-square logo cards for a catalogue where 90% of the cells had
 * no logo to put in them. Every one of those 532 cells was a grey square, a generic building
 * glyph and the brand name set at 11px — which is to say the page's dominant visual element was
 * an *absence*, repeated 532 times, over forty thousand pixels. That is the white space. It was
 * not a padding value; it was the wrong pattern for this data.
 *
 * A brand index is a NAVIGATION surface, and the canonical shape for one is a dense alphabetical
 * list with in-page anchors — Saks' designer index, cited by NN/G's "Anchors OK? Re-Assessing
 * In-Page Links" as the case where a jump list earns its place. The logos still exist and still
 * matter; they are the *featured* band above this one, where 45 of them fill their plates
 * instead of 532 empty ones defining the page.
 *
 * ── WHY EVERY BRAND IS STILL IN THE HTML ───────────────────────────────────────────────────
 * The obvious performance fix is to paginate or virtualise. Both were rejected: this page's
 * commercial job is to pass link equity to 577 brand landing pages, and a link that renders
 * only after a click or a scroll event is a link Google may never follow. Density is what makes
 * showing all of them affordable — a row here is one <a>, one <span> and a text node.
 *
 * ── HOW THE SEARCH STAYS CHEAP ─────────────────────────────────────────────────────────────
 * Three things, in order of how much they matter:
 *
 *   1. The needle set is built ONCE (`useMemo` over `entries`), not per keystroke. Folding 577
 *      accented strings on every letter typed is the entire cost of a filter like this.
 *   2. `useDeferredValue` on the query, so the input paints at the rate you type while the 577
 *      rows re-render at whatever rate React can afford. Without it, a fast typist on a mid
 *      Android drops frames in the field itself, which is the one place it is felt.
 *   3. No network. Everything the filter needs is already on the page.
 */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** The anchor id of a letter group. '#' (names starting with a digit) is `marques-chiffres`. */
function groupId(letter: string): string {
  return `marques-${letter === '#' ? 'chiffres' : letter}`;
}

/** Accent-folded, lowercased. Built once per entry — see the docblock. */
function fold(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

interface BrandDirectoryProps {
  entries: DirectoryEntry[];
  hasCounts: boolean;
  hasStockData: boolean;
  /** How many brands have at least one shippable product. Drives the availability control. */
  inStockBrandCount: number;
  /**
   * The band this directory sits on. The sticky toolbar must paint the SAME fill as its band (an
   * opaque bar of the other surface reads as a stray strip), and the letter hover must paint the
   * OTHER one or it is invisible. The page alternates bands, so it is the page that knows.
   */
  surface?: 'base' | 'sunken';
}

export function BrandDirectory({
  entries,
  hasCounts,
  hasStockData,
  inStockBrandCount,
  surface = 'base',
}: BrandDirectoryProps) {
  const toolbarFill = surface === 'sunken' ? 'bg-sunken' : 'bg-canvas';
  // Full class strings, not a template: Tailwind only emits classes it can read in the source.
  const letterHover = surface === 'sunken' ? 'group-hover/letter:bg-elevated' : 'group-hover/letter:bg-sunken';
  const [query, setQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});

  const haystack = useMemo(
    () => entries.map((e) => ({ entry: e, needle: fold(e.name) })),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = fold(deferredQuery.trim());
    let rows = haystack;
    if (q) rows = rows.filter((r) => r.needle.includes(q));
    let out = rows.map((r) => r.entry);
    if (inStockOnly) out = out.filter((e) => e.stock > 0);
    return out;
  }, [haystack, deferredQuery, inStockOnly]);

  const groups = useMemo(() => {
    const map = new Map<string, DirectoryEntry[]>();
    for (const entry of filtered) {
      const bucket = map.get(entry.letter);
      if (bucket) bucket.push(entry);
      else map.set(entry.letter, [entry]);
    }
    // '#' last: a reader scanning A→Z expects the numeric bucket at the end, not before A.
    return [...map.entries()].sort(([a], [b]) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const availableLetters = useMemo(() => new Set(groups.map(([letter]) => letter)), [groups]);
  const isFiltering = deferredQuery.trim().length > 0 || inStockOnly;

  /*
    ── THE RAIL FOLLOWS THE SCROLL ──────────────────────────────────────────────────────────
    An index whose highlight only moves when you click it tells you where you asked to go, not
    where you are — and on a 6,000px list those stop being the same answer within one flick of a
    thumb. One observer over ~27 headers, `rootMargin` biased to the top so a heading counts as
    "current" from the moment it reaches the sticky toolbar rather than when it leaves the
    screen. Re-created only when the set of groups changes, which is on filter, not on scroll.
  */
  useEffect(() => {
    const headers = groups
      .map(([letter]) => groupRefs.current[letter])
      .filter((el): el is HTMLElement => Boolean(el));
    if (headers.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records
          .filter((r) => r.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveLetter(visible.target.getAttribute('data-letter'));
      },
      { rootMargin: '-140px 0px -70% 0px', threshold: 0 }
    );
    headers.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [groups]);

  /*
    ── ONE LOADING SUBSCRIBER FOR 577 LINKS, NOT 577 ────────────────────────────────────────
    Every other link on the site is a `<LinkWithLoading>`, which calls `useRouter()` and
    `useLoading()` per instance. That is exactly right for a product card and exactly wrong here:
    577 of them is 577 context subscribers, so every unrelated change to the loading state
    re-renders the entire directory, and the hydration cost is paid on a page whose whole point
    was to stop being expensive.

    So the directory reads the context ONCE and catches the click on the way up. React already
    delegates events at the root, so this is one handler rather than 577 — and the brand's name
    comes off the row that was clicked instead of being duplicated into a `data-` attribute on
    every one of them.
  */
  const { setLoading, setLoadingMessage } = useLoading();
  const handleRowClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.('a.pt-brand-row');
      if (!anchor) return;
      const name = anchor.querySelector('.pt-brand-row__name')?.textContent?.trim();
      setLoadingMessage(name ? `Chargement de ${name}…` : 'Chargement…');
      setLoading(true);
    },
    [setLoading, setLoadingMessage]
  );

  /*
    ── THE LETTERS ARE LINKS, AND THE CLICK ONLY ADDS THE SMOOTH SCROLL ─────────────────────
    They were <button>s, which a crawler cannot follow and a reader cannot open, copy or share.
    Now each is `<a href="#marques-X">` to the group heading's id, so the jump works with no
    JavaScript at all and every letter is a real, addressable place in the page. The handler
    only upgrades it: smooth scroll (instant under prefers-reduced-motion), then
    `history.replaceState` so the URL carries the fragment without one history entry per letter.
    A modified click falls through to the browser, like any link.
  */
  const jumpTo = useCallback((event: React.MouseEvent<HTMLAnchorElement>, letter: string) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = groupRefs.current[letter];
    if (!target) return;
    event.preventDefault();
    setActiveLetter(letter);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    try {
      window.history.replaceState(window.history.state, '', `#${groupId(letter)}`);
    } catch {
      // A sandboxed frame can refuse replaceState; the scroll has already happened.
    }
  }, []);

  return (
    <div>
      {/*
        ── THE TOOLBAR IS STICKY, AND IT CARRIES THE ALPHABET ─────────────────────────────────
        `top-[var(--header-h)]` rather than a number: the site header is sticky here (only /shop
        and the product page unstick it), it is 65px on a phone and 114px from 768, and it collapses
        by 10-20px on scroll. This shipped as a hardcoded `4.25rem` the same day the token was
        introduced on /shop — 68px, which is 3px short of the phone header and 46px short of the
        desktop one.

        `bg-canvas`, not `bg-canvas/95`: DS009 bans backdrop-blur outright, so a translucent chrome
        surface can never be masked and 45 brand logos ghost through it as you scroll.

        `border-b border-rule`, not `border-y border-hairline`: a bar with no fill difference against
        the page it sits on needs the stronger of the two boundary weights — hairline measures
        1.26:1 there. The top border goes because with zero seam this bar sits flush under the
        header's own `border-b border-rule`, and two adjacent rules paint as one 2px double line. Search, availability and the A–Z live in one bar because they are
        one decision ("narrow this list") and because on a directory this long the controls are
        off-screen for the entire time they are wanted otherwise.
      */}
      <div className={`sticky top-[var(--header-h)] z-30 -mx-4 mb-5 border-b border-rule ${toolbarFill} px-4 py-2 transition-[top] duration-200 motion-reduce:transition-none sm:-mx-6 sm:px-6 sm:py-2.5 lg:-mx-8 lg:px-8`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
            <input
              type="text"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une marque…"
              aria-label="Rechercher une marque"
              /* 16px literal below `sm`: iOS Safari zooms the viewport on focusing any input
                 under it, and a directory you have to pinch back out of is worse than no filter. */
              className="h-11 w-full rounded-xl border border-hairline bg-elevated pl-9 pr-9 text-[16px] text-ink-1 placeholder:text-ink-3 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus/15 sm:text-[13.5px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
                /* 44px square inside the 44px field: the target is the field's full height. */
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-3 transition-colors hover:text-brand"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {/*
              ── AVAILABILITY IS A CONTROL, NOT A FOOTNOTE ────────────────────────────────────
              577 brands are published and 30 of them have something that can be shipped today —
              the iHerb import is 11,130 rows at `rupture = 1, qte = 0`. Hiding that makes the
              directory a list of names; printing it as a filter makes it the fastest route to a
              brand you can actually order from. The count is on the control so it reads as a
              fact about the catalogue rather than as a filter that broke.
            */}
            {hasStockData && inStockBrandCount > 0 && (
              <button
                type="button"
                onClick={() => setInStockOnly((v) => !v)}
                aria-pressed={inStockOnly}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition-colors ${
                  inStockOnly
                    ? 'border-brand bg-brand/[0.08] text-brand'
                    : 'border-hairline bg-elevated text-ink-1 hover:border-brand hover:text-brand'
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    inStockOnly ? 'border-brand bg-brand text-on-brand' : 'border-rule'
                  }`}
                  aria-hidden="true"
                >
                  {inStockOnly && <Check className="h-3 w-3" />}
                </span>
                En stock
                <span className="tabular-nums font-normal text-ink-3">({inStockBrandCount})</span>
              </button>
            )}

            <p className="shrink-0 text-[13px] tabular-nums text-ink-2">
              <span className="font-semibold text-ink-1">{filtered.length}</span>{' '}
              marque{filtered.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* The alphabet. Hidden while a search is running: the groups it points at have mostly
            stopped existing, and a rail of disabled letters is noise on the one screen where the
            reader has already told us exactly what they want. */}
        {!isFiltering && (
          <nav
            aria-label="Index alphabétique des marques"
            /* 27 letters x 44px is ~1,190px and a phone is 390, so below `xl` the rail scrolls.
               The mask fades the last ~24px instead of cutting a letter in half, which is the
               difference between "there is more" and "this is clipped". From `xl` (rail ≥1,201px
               at 1280 with a scrollbar) every letter takes an equal share, gap-free, and nothing
               scrolls. Not from `lg`: at 1024 an equal share is ~33px wide, under the 44px
               target floor (measured 06/10/2026: 33.1 x 44 at 1024, 42.5 x 44 at 1280 with gaps).

               Each letter is a 44px-tall TARGET around a 32px VISUAL: the link is the hit area,
               the inner span is the pill. `mt-0.5 -mb-1.5` gives back the 12px the taller targets
               add, so the sticky toolbar is exactly as tall as it was with 32px buttons. */
            className="-mb-1.5 mt-0.5 flex items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] [scrollbar-width:none] xl:gap-0 xl:[mask-image:none] [&::-webkit-scrollbar]:hidden"
          >
            {[...LETTERS, '#'].map((letter) => {
              const enabled = availableLetters.has(letter);
              const current = activeLetter === letter;
              const slot =
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg xl:w-auto xl:min-w-11 xl:flex-1';
              const pill =
                'flex h-8 w-8 items-center justify-center rounded-lg font-display text-[12px] font-bold tabular-nums transition-colors';
              if (!enabled) {
                // No group, no target: the '#' slot is simply absent, a missing letter is a
                // dimmed glyph and NOT a link — a fragment with no element behind it is a dead end.
                if (letter === '#') return null;
                return (
                  <span key={letter} className={slot} aria-hidden="true">
                    <span className={`${pill} cursor-default text-ink-3/40`}>{letter}</span>
                  </span>
                );
              }
              return (
                <a
                  key={letter}
                  href={`#${groupId(letter)}`}
                  onClick={(event) => jumpTo(event, letter)}
                  aria-label={
                    letter === '#'
                      ? 'Aller aux marques commençant par un chiffre'
                      : `Aller aux marques en ${letter}`
                  }
                  aria-current={current ? 'true' : undefined}
                  className={`group/letter ${slot} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus`}
                >
                  {/* `bg-brand text-on-brand` for the current letter, never a scope class: a
                      scope on a FOCUSABLE element resolves its focus ring in its own scope and
                      paints it on the parent band's surface — tokens.css says so explicitly. */}
                  <span
                    className={`${pill} ${
                      current
                        ? 'bg-brand text-on-brand'
                        : `text-ink-2 group-hover/letter:text-brand ${letterHover}`
                    }`}
                  >
                    {letter}
                  </span>
                </a>
              );
            })}
          </nav>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-hairline bg-elevated px-4 py-16 text-center">
          <p className="mb-1 font-display text-lg font-bold uppercase tracking-wide text-ink-1">
            Aucune marque trouvée
          </p>
          <p className="mb-6 max-w-md text-sm text-ink-2">
            {inStockOnly
              ? 'Aucune marque ne correspond à cette recherche parmi celles disponibles en stock.'
              : 'Essayez une autre orthographe, ou parcourez l’index alphabétique.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setInStockOnly(false);
            }}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-brand px-5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-on-brand"
          >
            Voir toutes les marques
          </button>
        </div>
      ) : (
        <div className="space-y-7" onClick={handleRowClick}>
          {groups.map(([letter, brands]) => (
            <section key={letter} aria-labelledby={groupId(letter)}>
              {/*
                The letter is the divider AND the anchor target. The heading holds the letter and
                nothing else — it used to carry the count too, so its text read « A31 marques ».
                The count is a sibling now.

                `scroll-mt` is the header plus the sticky toolbar, which is ~153px tall on a phone
                (search, then the stock filter on its own row, then the rail) and ~105px from `sm`
                (one row + the rail). The old fixed `scroll-mt-40` (160px) landed every jump with
                the heading under the toolbar at both widths.
              */}
              <div className="mb-2 flex items-center gap-3 border-b border-rule pb-1.5">
                <h3
                  id={groupId(letter)}
                  data-letter={letter}
                  ref={(el) => {
                    groupRefs.current[letter] = el;
                  }}
                  className="scroll-mt-[calc(var(--header-h)+10rem)] font-display font-compressed text-[1.5rem] font-extrabold uppercase leading-none tracking-[-0.02em] text-brand sm:scroll-mt-[calc(var(--header-h)+7rem)]"
                >
                  {letter}
                </h3>
                <span className="flex-1" aria-hidden="true" />
                <p className="text-[11px] tabular-nums text-ink-3">
                  {brands.length} marque{brands.length > 1 ? 's' : ''}
                </p>
              </div>

              {/*
                ── FIVE COLUMNS OF TEXT, NOT FIVE COLUMNS OF CARDS ──────────────────────────
                A row is `<a>` + `<span>`. 577 of them is ~2,300 nodes against the 11,952 the
                logo grid needed for the same links, and the column count is chosen so the
                longest names in the catalogue ("Advanced Orthomolecular Research AOR",
                "USN Ultimate Sports Nutrition") still get a legible measure at each width.
              */}
              <ul className="grid grid-cols-2 gap-x-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    {/* `.pt-brand-row*` rather than utilities: 577 rows x ~260 chars of
                        className was 150 KB of the document. See globals.css. */}
                    <Link href={`/${brand.slug}`} prefetch={false} className="pt-brand-row">
                      <span className="pt-brand-row__lead">
                        {brand.stock > 0 && (
                          <span className="pt-brand-row__dot" aria-hidden="true" />
                        )}
                        <span className="pt-brand-row__name">{brand.name}</span>
                        {brand.stock > 0 && <span className="sr-only">(en stock)</span>}
                      </span>
                      {hasCounts && (
                        <span className="pt-brand-row__count">{brand.count}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
