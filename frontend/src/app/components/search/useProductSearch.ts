'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchProducts } from '@/services/api';
import type { Product } from '@/types';

/**
 * The data half of the header search — debounce, cancellation, caching and a query floor.
 *
 * ── WHY THIS IS A HOOK AND NOT FOUR LINES IN THE COMPONENT ──────────────────────────────────
 * It used to be four lines in the component, and three of the four problems below are invisible
 * until the network is slow. Owner, 19/08/2026: *"I want to focus on the performance, the
 * fastness, how much memory, and it works on low internet."* That is a specification, and every
 * item here is one of its clauses.
 *
 * 1. THE RACE. The old effect fired a request per debounce window and wrote whatever came back.
 *    Responses do not arrive in the order they were sent — on a 3G connection a request for "wh"
 *    can land two seconds after the one for "whey" — so the list would fill with results for a
 *    prefix the field no longer contains, and there was nothing in the UI to explain it. This is
 *    not a rare edge: it is the DEFAULT behaviour on a bad connection, which is exactly the case
 *    the owner named. Every request now carries an AbortController and the previous one is
 *    aborted before the next is sent, so a stale response cannot exist to be written.
 *
 * 2. THE CACHE. Typing "creatine" and pressing backspace twice used to be two more full round
 *    trips for a result the browser had already seen. Results are keyed by the normalised query
 *    in a module-level Map — module-level so it survives the panel closing, which is when a
 *    shopper is most likely to re-open and retype the same word.
 *
 *    IT IS BOUNDED, and that is the part worth being careful about. An unbounded Map on a search
 *    field is a memory leak with a friendly name: every distinct prefix a user ever types stays
 *    resident for the life of the tab. 40 entries of ~8 KB is ~320 KB worst case, and eviction is
 *    oldest-first (Map preserves insertion order, so the first key is the oldest).
 *
 * 3. THE FLOOR. One character matched several thousand products, took the slowest query the
 *    endpoint can run, and told the shopper nothing. Two is the floor. It is also free: a query
 *    below it resolves synchronously to the resting state with no request at all.
 *
 * 4. THE IN-FLIGHT MAP. Two components mount this hook (the desktop field and the mobile panel)
 *    and React Strict Mode double-invokes effects in development. Without dedupe that is two
 *    identical requests for the same string; with it, the second awaits the first.
 *
 * The debounce is 250ms rather than 300: 250 is still comfortably above a fast typist's
 * inter-key interval (~120ms) and the request itself is now 8.9 KB instead of 67, so starting it
 * marginally earlier costs much less than it used to.
 */

export const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
const CACHE_MAX = 40;

export interface SearchResult {
  products: Product[];
  /** `pagination.total` — the real match count, not the page size. */
  total: number;
}

const EMPTY: SearchResult = { products: [], total: 0 };

/** Normalised so "  Whey " and "whey" are one cache entry and one request. */
const keyOf = (q: string) => q.trim().toLowerCase().replace(/\s+/g, ' ');

const cache = new Map<string, SearchResult>();
const inFlight = new Map<string, Promise<SearchResult>>();

function remember(key: string, value: SearchResult) {
  // Re-insert so a repeated hit counts as recent: delete then set moves it to the end.
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function readCache(key: string): SearchResult | undefined {
  const hit = cache.get(key);
  if (hit) remember(key, hit);
  return hit;
}

export function useProductSearch(query: string) {
  const key = keyOf(query);
  const tooShort = key.length < MIN_QUERY_LENGTH;

  /* Seeded from the cache so a cached query renders on the FIRST paint with no loading flash —
     the whole point of caching a search is that the second time it should not look like work. */
  const [result, setResult] = useState<SearchResult>(() => (tooShort ? EMPTY : readCache(key) ?? EMPTY));
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  /** The key whose data `result` holds — how we know a keystroke has outrun the network. */
  const settledKey = useRef<string>(tooShort ? '' : (readCache(key) ? key : ''));
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (tooShort) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResult(EMPTY);
      setIsLoading(false);
      setFailed(false);
      settledKey.current = '';
      return;
    }

    const cached = readCache(key);
    if (cached) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResult(cached);
      setIsLoading(false);
      setFailed(false);
      settledKey.current = key;
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setFailed(false);

      const pending =
        inFlight.get(key) ??
        searchProducts(key, controller.signal).then((r) => {
          remember(key, r);
          return r;
        });
      inFlight.set(key, pending);

      pending
        .then((r) => {
          if (cancelled || controller.signal.aborted) return;
          setResult(r);
          settledKey.current = key;
          setIsLoading(false);
        })
        .catch((err) => {
          // An abort is the expected outcome of typing another character, not an error.
          if (cancelled || controller.signal.aborted) return;
          if (err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') return;
          console.error('[search] failed:', err);
          setResult(EMPTY);
          setFailed(true);
          setIsLoading(false);
        })
        .finally(() => {
          if (inFlight.get(key) === pending) inFlight.delete(key);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, tooShort]);

  // Aborting on unmount is what stops a closed panel from finishing a download nobody will read.
  useEffect(() => () => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setResult(EMPTY);
    setIsLoading(false);
    setFailed(false);
    settledKey.current = '';
  }, []);

  return {
    products: result.products,
    total: result.total,
    /** A request is out. */
    isLoading,
    /** The field has moved past what `products` describes — debouncing or fetching. */
    isStale: !tooShort && settledKey.current !== key,
    /** Below MIN_QUERY_LENGTH: show the resting panel, not an empty state. */
    tooShort,
    failed,
    reset,
  };
}
