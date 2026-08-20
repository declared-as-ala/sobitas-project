'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLoading } from '@/contexts/LoadingContext';

export function NavigationHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();
  const prevPathnameRef = useRef<string | null>(null);

  /*
   * ── THE REF WAS NEVER ADVANCED PAST THE FIRST PAGE ────────────────────────────────────────
   * `prevPathnameRef.current = pathname` sat AFTER an early `return`, so it only ran on the
   * branch where nothing had changed. The moment a navigation actually happened the effect took
   * the other branch, returned its cleanup, and left the ref pinned to the landing page forever.
   *
   * The failure that produces: land on /, go to /shop (ref still '/'), open a product, then press
   * Back twice to reach / again. `prevPathnameRef.current === '/'` and `pathname === '/'`, so the
   * condition is false, `setLoading(false)` never runs — and the red progress bar that
   * LinkWithLoading switched on at the click stays on the screen indefinitely, on a page that has
   * finished loading. It is stuck until some other navigation happens to clear it.
   *
   * The assignment moves ABOVE the branch and runs on every pass, which is the only place a
   * "previous value" ref is ever correct.
   *
   * `searchParams` stays in the deps and deliberately does NOT gate the clear: /shop?page=2 is a
   * navigation the shopper waits for, and comparing pathnames alone would leave the bar running
   * through every pager click and every filter change on the busiest page of the site.
   */
  useEffect(() => {
    const previous = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    // Nothing to clear on the initial mount — no navigation has been started.
    if (previous === null) return;

    // Small delay to ensure page content has started loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [pathname, searchParams, setLoading]);

  return null;
}
