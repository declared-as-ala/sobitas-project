'use client';

import { useEffect, useState } from 'react';
import { getBestSellers } from '@/services/api';
import type { Product } from '@/types';

/**
 * The two products in the resting search panel.
 *
 * ── FETCHED ON FIRST FOCUS, ONCE PER TAB, AND NEVER AGAIN ───────────────────────────────────
 * Three deliberate constraints, because this sits behind a control that renders on every page of
 * the site:
 *
 *   1. NOT AT MOUNT. The header mounts everywhere; this panel opens on a minority of visits.
 *      Fetching at mount would put a request on every page load to populate a box most people
 *      never see — which is precisely the kind of cost the rest of this work is removing.
 *   2. MODULE-LEVEL CACHE. Best-sellers do not change between two focuses of a search field, so
 *      the second open reads from memory. 4 KB, measured.
 *   3. ONE IN-FLIGHT PROMISE. The desktop field and the mobile panel both mount this, and React
 *      Strict Mode double-invokes effects in development; without the shared promise that is two
 *      to four identical requests on the first focus.
 *
 * A failure is silent by design. These are a nicety on a panel whose real job is the input; an
 * error state here would be louder than the thing it is reporting.
 */

let cached: Product[] | null = null;
let pending: Promise<Product[]> | null = null;

function load(): Promise<Product[]> {
  if (cached) return Promise.resolve(cached);
  pending ??= getBestSellers()
    .then((list) => {
      cached = Array.isArray(list) ? list.slice(0, 3) : [];
      return cached;
    })
    .catch(() => {
      // Do not memoise a failure: a later focus on a recovered connection should try again.
      pending = null;
      return [];
    });
  return pending;
}

/** @param enabled true once the panel has been opened at least once. */
export function useSearchSuggestions(enabled: boolean): Product[] {
  const [products, setProducts] = useState<Product[]>(() => cached ?? []);

  useEffect(() => {
    if (!enabled || cached) return;
    let alive = true;
    load().then((list) => {
      if (alive) setProducts(list);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return cached ?? products;
}
