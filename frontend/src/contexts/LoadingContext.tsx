'use client';

import { createContext, useCallback, useContext, useMemo, useState, useRef, useEffect, ReactNode } from 'react';

/**
 * ── THE NAVIGATION PROGRESS BAR, AND WHY IT WAS COSTING 300ms PER TAP ───────────────────────
 * Owner, 20/08/2026: *"there is a big issue in the whole site, sometimes it takes so long to act,
 * and this is making the mobile web vital low — INP."*
 *
 * MEASURED on production at 390px with 4x CPU throttling, tapping "Voir les 213 résultats" in the
 * search panel: a **327ms long task fires on the click itself**, before any navigation begins.
 * Nothing had been fetched yet and no route had changed. The entire cost was this file.
 *
 * ── WHAT WAS WRONG ──────────────────────────────────────────────────────────────────────────
 * One context carried both the STATE (`isLoading`, `loadingMessage`) and the SETTERS, and its
 * value object was rebuilt inline on every render:
 *
 *     <LoadingContext.Provider value={{ isLoading, setLoading, loadingMessage, setLoadingMessage }}>
 *
 * `setLoading` and `updateLoadingMessage` were also redeclared as new function identities every
 * render. So a single `setLoading(true)` re-rendered the provider, produced a brand-new context
 * value, and React then re-rendered EVERY consumer of this context.
 *
 * The consumer is `LinkWithLoading`, which wraps every product card, every search result, every
 * footer link, every nav item and every category tile on the site. On the homepage that is ~40
 * components; on /shop with 24 cards it is more. All of them re-render, synchronously, inside the
 * click handler — which is exactly the window INP measures.
 *
 * The bar itself is 2px tall.
 *
 * ── THE SPLIT ───────────────────────────────────────────────────────────────────────────────
 * Two contexts, because there are two audiences and they have opposite needs:
 *
 *   ACTIONS  `setLoading` / `setLoadingMessage`. Stable for the lifetime of the app — memoised
 *            once, with the state they touch held in refs so the callbacks never need to be
 *            rebuilt. Every LinkWithLoading reads THIS one, and therefore never re-renders when
 *            a navigation starts.
 *
 *   STATE    `isLoading` / `loadingMessage`. Changes on every navigation, and has exactly one
 *            consumer: GlobalLoader, which renders a 2px bar.
 *
 * The rule this encodes is general: a context that mixes "what happened" with "how to change it"
 * makes every writer pay the re-render cost of every reader. Keep them apart.
 */

interface LoadingState {
  isLoading: boolean;
  loadingMessage: string;
}

interface LoadingActions {
  setLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

const LoadingStateContext = createContext<LoadingState | undefined>(undefined);
const LoadingActionsContext = createContext<LoadingActions | undefined>(undefined);

// Minimum display time to avoid flicker on fast navigations
const MIN_LOADING_TIME = 300;

function clearTimer(ref: React.MutableRefObject<NodeJS.Timeout | null>) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setMessage] = useState('Chargement...');
  const loadingStartTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      clearTimer(timeoutRef);
      clearTimer(messageTimeoutRef);
    };
  }, []);

  /* `useCallback` with an EMPTY dependency list, and it is empty legitimately: everything these
     touch is either a ref or a state setter, and React guarantees setter identity. Nothing here
     closes over a value that can go stale. */
  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      loadingStartTimeRef.current = Date.now();
      setIsLoading(true);
      clearTimer(timeoutRef);
      clearTimer(messageTimeoutRef);
      return;
    }

    const elapsed = loadingStartTimeRef.current ? Date.now() - loadingStartTimeRef.current : 0;
    const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

    const finish = () => {
      timeoutRef.current = null;
      setIsLoading(false);
      loadingStartTimeRef.current = null;
      clearTimer(messageTimeoutRef);
      messageTimeoutRef.current = setTimeout(() => {
        messageTimeoutRef.current = null;
        setMessage('Chargement...');
      }, 300);
    };

    if (remaining > 0) {
      timeoutRef.current = setTimeout(finish, remaining);
    } else {
      finish();
    }
  }, []);

  const setLoadingMessage = useCallback((message: string) => {
    setMessage(message);
  }, []);

  /* Memoised on the two callbacks, which never change — so this object is created once for the
     life of the app and no consumer of it ever re-renders. That is the whole point. */
  const actions = useMemo<LoadingActions>(() => ({ setLoading, setLoadingMessage }), [setLoading, setLoadingMessage]);

  const state = useMemo<LoadingState>(() => ({ isLoading, loadingMessage }), [isLoading, loadingMessage]);

  return (
    <LoadingActionsContext.Provider value={actions}>
      <LoadingStateContext.Provider value={state}>{children}</LoadingStateContext.Provider>
    </LoadingActionsContext.Provider>
  );
}

/**
 * The setters only. This is what a link wants, and subscribing to it costs no re-renders.
 *
 * Kept under the name `useLoading` so the fifteen call sites do not need touching, but it
 * deliberately no longer returns `isLoading` — a component that reads the flag from here would
 * silently reintroduce the re-render storm this split exists to remove. Read the state with
 * `useLoadingState`, and be sure you want it.
 */
export function useLoading(): LoadingActions {
  const context = useContext(LoadingActionsContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

/** The flag and the message. One consumer: GlobalLoader. */
export function useLoadingState(): LoadingState {
  const context = useContext(LoadingStateContext);
  if (context === undefined) {
    throw new Error('useLoadingState must be used within a LoadingProvider');
  }
  return context;
}
