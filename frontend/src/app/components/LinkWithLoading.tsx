'use client';

import { ReactNode, MouseEvent, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

interface LinkWithLoadingProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  loadingMessage?: string;
  [key: string]: any;
}

/** True if href is same-origin internal (e.g. /shop/foo). */
function isInternalLink(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Hrefs already prefetched in this page's lifetime. Module scope, not per-instance: the same
 * destination is often reachable from several links (a card and its title, a rayon in the rail and
 * the same rayon in the pane), and prefetching it twice is a wasted request either way.
 */
const prefetched = new Set<string>();

/**
 * We must NOT preventDefault + router.push() for internal links.
 * Otherwise prefetch runs first; if the RSC returns 404 (e.g. dynamic route not yet resolved),
 * that 404 is cached and router.push() then shows it — while a full page load works.
 * So for internal links we use native Next.js Link behavior (no custom prefetch/push).
 */
export function LinkWithLoading({
  href,
  children,
  className,
  onClick,
  loadingMessage,
  /*
   * Pulled out of `...props` and COMPOSED below rather than spread over the handlers this
   * component adds. Spreading would silently win — `{...props}` comes last on the element — and
   * the four call sites that pass an `onMouseEnter` (the mega-menu trigger, its "Voir tous les
   * produits" row, the pack card) would be the four links that lost intent prefetching. A prop
   * that disables an optimisation by being present is the kind of bug nobody finds.
   */
  onMouseEnter: onMouseEnterProp,
  onMouseLeave: onMouseLeaveProp,
  onFocus: onFocusProp,
  onPointerDown: onPointerDownProp,
  onTouchStart: onTouchStartProp,
  ...props
}: LinkWithLoadingProps) {
  const router = useRouter();
  /*
   * The ACTIONS context only. It is memoised once for the life of the app, so this component — of
   * which there are ~40 on the homepage and more on /shop — does not re-render when a navigation
   * starts. Reading `isLoading` here instead is what used to cost 327ms of main thread inside the
   * click handler; see LoadingContext.tsx.
   */
  const { setLoading, setLoadingMessage } = useLoading();
  const intentTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * ── PREFETCH ON INTENT, WHICH IS NOT WHAT `prefetch={false}` LEAVES YOU ──────────────────
   * The note below this one says Next "still prefetches on hover and on touchstart" with
   * `prefetch={false}`. That was true of the pages router and is FALSE in the app router. From
   * next/dist/client/app-dir/link.js:
   *
   *     const prefetchEnabled = prefetchProp !== false;
   *     onMouseEnter:  if (!prefetchEnabled || NODE_ENV === 'development') return;
   *     onTouchStart:  if (!prefetchEnabled) return;
   *
   * One flag gates all three strategies. So every product card, every search result, every footer
   * link and every nav item on this site has had NO prefetch of any kind — viewport, hover or
   * touch — since the day that prop was added.
   *
   * MEASURED, tapping "Voir les 213 résultats" at 390px with 4x CPU throttle:
   *
   *     +  26 ms   RSC payload for /shop?search=creatine requested   (353 ms)
   *     + 386 ms   the shop route's four JS chunks requested          (~230 ms each)
   *     + 620 ms   ...only now can React begin rendering the page
   *
   * ~950ms of the wait was fetching things that a hover or a touchstart could have started.
   *
   * So intent prefetching is done here explicitly. `router.prefetch()` warms the same RSC cache
   * Next would have used, and because it is driven by a real gesture it never degenerates into
   * the viewport prefetch that put 1.4 MB of other people's pages on /shop.
   *
   * 90ms of hover before firing: a pointer crossing a grid on its way somewhere else passes over
   * a card in well under that, and a deliberate hover lasts far longer. `pointerdown` and
   * `touchstart` fire immediately — by then the intent is not in question, and on a phone the
   * ~80ms before `click` is free time.
   */
  const prefetchNow = useCallback(() => {
    if (!isInternalLink(href) || prefetched.has(href)) return;
    prefetched.add(href);
    try {
      router.prefetch(href);
    } catch {
      // A prefetch that fails must never affect the click that follows it.
      prefetched.delete(href);
    }
  }, [href, router]);

  const onIntentStart = useCallback(
    (e: any) => {
      if (onMouseEnterProp) onMouseEnterProp(e);
      if (intentTimer.current) clearTimeout(intentTimer.current);
      intentTimer.current = setTimeout(prefetchNow, 90);
    },
    [prefetchNow, onMouseEnterProp]
  );

  const onIntentEnd = useCallback(
    (e: any) => {
      if (onMouseLeaveProp) onMouseLeaveProp(e);
      if (intentTimer.current) {
        clearTimeout(intentTimer.current);
        intentTimer.current = null;
      }
    },
    [onMouseLeaveProp]
  );

  const onIntentImmediate = useCallback(
    (handler: ((e: any) => void) | undefined) => (e: any) => {
      if (handler) handler(e);
      prefetchNow();
    },
    [prefetchNow]
  );

  // The timer is per-instance; a card unmounting mid-hover (a filter change on /shop swaps the
  // whole grid) would otherwise fire a prefetch for a link that no longer exists.
  useEffect(() => () => { if (intentTimer.current) clearTimeout(intentTimer.current); }, []);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);

    if (
      e.ctrlKey ||
      e.metaKey ||
      e.shiftKey ||
      e.defaultPrevented ||
      href.startsWith('http') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      href.startsWith('#')
    ) {
      return;
    }

    // Internal links: show loading state but let Next.js Link handle navigation (avoids 404 from custom prefetch+push cache)
    if (isInternalLink(href)) {
      setLoadingMessage(loadingMessage || 'Chargement...');
      setLoading(true);
      return;
    }

    e.preventDefault();
    setLoadingMessage(loadingMessage || 'Chargement...');
    setLoading(true);
    try {
      router.prefetch(href);
      router.push(href);
    } catch (error) {
      console.error('Navigation error:', error);
      setLoading(false);
    }
  };

  return (
    /*
     * ── prefetch DEFAULTS OFF, AND THE PRODUCT GRID IS WHY ────────────────────────────────
     * MEASURED on /shop (production build, 1536, cold cache) with 24 cards on screen: the page
     * pulled 967 KB of `fetch`, and it was not the shop's data — it was Next prefetching the RSC
     * payload of every product page whose card was in the viewport, at ~59 KB each. Twenty-four
     * cards is roughly 1.4 MB of other pages downloaded before the shopper has looked at one of
     * them, on the page that already carries the most images on the site.
     *
     * This component wraps every product card, every search result and every footer link, so the
     * default belongs HERE rather than at two dozen call sites.
     *
     * `false` disables ALL of Next's prefetching, hover and touch included — see the note on
     * `prefetchNow` above, which is why the handlers below exist. What we keep is the part worth
     * keeping: "this card is on screen" is never evidence that the shopper wants that page, and a
     * gesture toward it always is.
     *
     * A caller that genuinely wants eager prefetch can still pass `prefetch` — it is spread after
     * this, so the prop wins.
     */
    <Link
      href={href}
      prefetch={false}
      className={className}
      onClick={handleClick}
      onMouseEnter={onIntentStart}
      onMouseLeave={onIntentEnd}
      onFocus={onIntentImmediate(onFocusProp)}
      onPointerDown={onIntentImmediate(onPointerDownProp)}
      onTouchStart={onIntentImmediate(onTouchStartProp)}
      {...props}
    >
      {children}
    </Link>
  );
}
