'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'sobitas_favoris';

export interface FavoriteProduct {
  id: number;
  designation_fr: string;
  slug?: string;
  cover?: string;
  prix?: number;
  promo?: number | null;
  // Persisted so /favoris can tell an EXPIRED promo from an active one (without it, a promo with
  // no expiry reads as permanently active) and can gate add-to-cart on real stock.
  promo_expiration_date?: string | null;
  qte?: number;
  rupture?: number | boolean;
  /**
   * The aisle and the brand this product belongs to.
   *
   * Persisted so /favoris can answer "more like these" WITHOUT a request per favourite. The
   * wishlist lives entirely in localStorage — there is no favourites row in the database — so the
   * only thing the page knows about a saved product is what was written here when the heart was
   * tapped, and `sous_categorie_id` is the one field the recommendation endpoint takes.
   *
   * Both are optional and both are allowed to be missing: every favourite saved before this field
   * existed has neither, and the page falls back to reading ONE product's detail to discover the
   * aisle rather than showing nothing. Nothing breaks, it just costs a request until the list
   * turns over.
   */
  sous_categorie_id?: number;
  brand_id?: number;
}

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  favoriteProducts: FavoriteProduct[];
  /** True once favorites have been rehydrated from localStorage (avoid flashing the empty state). */
  isLoaded: boolean;
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (product: FavoriteProduct) => void;
  addFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (productId: number) => void;
  /** Empty the whole list in one write. Looping removeFavorite would be N renders and N
   *  localStorage writes for one gesture the shopper thinks of as a single action. */
  clearFavorites: () => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Same INP split as CartContext — see the long note there for why, and for the field numbers.
 *
 * The defect here was slightly worse, because `isFavorite` looks like a cheap helper and is not:
 * it was `useCallback(…, [favoriteProducts])`, so it was recreated whenever ANY product was
 * favourited, which changed the context value, which re-rendered every one of the 23 ProductCards
 * on the homepage — each of which then called `isFavorite` for its own id and got the same answer
 * as before. Tapping one heart re-rendered the whole grid to change one icon's fill.
 */
type FavoritesActions = Pick<FavoritesContextValue, 'toggleFavorite' | 'addFavorite' | 'removeFavorite' | 'clearFavorites'>;
const FavoritesActionsContext = createContext<FavoritesActions | null>(null);

type FavoritesStore = {
  subscribe: (onChange: () => void) => () => void;
  isFavorite: (productId: number) => boolean;
  getCount: () => number;
};
const FavoritesStoreContext = createContext<FavoritesStore | null>(null);

function loadFromStorage(): FavoriteProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as FavoriteProduct[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveToStorage(products: FavoriteProduct[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch {
    // ignore
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const favoriteIds = useMemo(() => new Set(favoriteProducts.map((p) => p.id)), [favoriteProducts]);

  // Readable without subscribing. Assigned during render, not in an effect, so a snapshot taken
  // in the render pass right after a toggle already reflects it — see CartProvider for the full
  // reasoning (an effect runs too late and the heart paints one tap behind).
  const idsRef = useRef(favoriteIds);
  idsRef.current = favoriteIds;

  const listenersRef = useRef<Set<() => void>>(new Set());
  useEffect(() => {
    listenersRef.current.forEach((notify) => notify());
  }, [favoriteIds]);

  const store = useMemo<FavoritesStore>(
    () => ({
      subscribe: (onChange) => {
        listenersRef.current.add(onChange);
        return () => {
          listenersRef.current.delete(onChange);
        };
      },
      isFavorite: (productId) => idsRef.current.has(productId),
      getCount: () => idsRef.current.size,
    }),
    []
  );

  useEffect(() => {
    setFavoriteProducts(loadFromStorage());
    setIsLoaded(true);
  }, []);

  const persist = useCallback((next: FavoriteProduct[]) => {
    setFavoriteProducts(next);
    saveToStorage(next);
  }, []);

  const isFavorite = useCallback(
    (productId: number) => favoriteIds.has(productId),
    [favoriteProducts]
  );

  const addFavorite = useCallback((product: FavoriteProduct) => {
    setFavoriteProducts((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      const next = [...prev, { id: product.id, designation_fr: product.designation_fr, slug: product.slug, cover: product.cover, prix: product.prix, promo: product.promo, promo_expiration_date: product.promo_expiration_date, qte: product.qte, rupture: product.rupture, sous_categorie_id: product.sous_categorie_id, brand_id: product.brand_id }];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((productId: number) => {
    setFavoriteProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavoriteProducts([]);
    saveToStorage([]);
  }, []);

  // `idsRef`, not `favoriteIds` — and therefore an EMPTY dependency list, so this function is
  // created once. Depending on `favoriteIds` is what made every heart tap invalidate the context
  // value for all 23 cards.
  const toggleFavorite = useCallback(
    (product: FavoriteProduct) => {
      if (idsRef.current.has(product.id)) {
        removeFavorite(product.id);
      } else {
        addFavorite(product);
      }
    },
    [addFavorite, removeFavorite]
  );

  const value = useMemo<FavoritesContextValue>(() => ({
    favoriteIds,
    favoriteProducts,
    isLoaded,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    count: favoriteProducts.length,
  }), [favoriteIds, favoriteProducts, isLoaded, isFavorite, toggleFavorite, addFavorite, removeFavorite, clearFavorites]);

  // Built once — every member is stable for the provider's lifetime. See CartProvider.
  const actions = useMemo<FavoritesActions>(
    () => ({ toggleFavorite, addFavorite, removeFavorite, clearFavorites }),
    [toggleFavorite, addFavorite, removeFavorite, clearFavorites]
  );

  return (
    <FavoritesContext.Provider value={value}>
      <FavoritesActionsContext.Provider value={actions}>
        <FavoritesStoreContext.Provider value={store}>{children}</FavoritesStoreContext.Provider>
      </FavoritesActionsContext.Provider>
    </FavoritesContext.Provider>
  );
}

/**
 * The FULL favourites list. Re-renders whenever it changes — correct for /favoris and the header
 * counter. Not for a component rendered once per product in a grid.
 */
export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}

/**
 * How many favourites there are — for the header and tab-bar badges.
 *
 * Measured: with the header still on `useFavorites()`, heart taps that should have cost ~50 ms
 * cost 287-308 ms, because the full context value changes on every toggle and HeaderClient is
 * ~1,050 lines. A number bails out unless the count itself moved.
 */
export function useFavoritesCount(): number {
  const store = useContext(FavoritesStoreContext);
  if (!store) throw new Error('useFavoritesCount must be used within FavoritesProvider');
  return useSyncExternalStore(
    store.subscribe,
    () => store.getCount(),
    () => 0
  );
}

/** Mutators only; never changes identity, so consumers are never re-rendered by other cards. */
export function useFavoritesActions(): FavoritesActions {
  const ctx = useContext(FavoritesActionsContext);
  if (!ctx) throw new Error('useFavoritesActions must be used within FavoritesProvider');
  return ctx;
}

/**
 * Whether ONE product is favourited, as a narrow subscription. The snapshot is a boolean, so
 * React's Object.is bailout means only the card whose state actually flipped re-renders.
 * The server snapshot is constant `false`: favourites live in localStorage and are empty in SSR.
 */
export function useIsFavorite(productId: number): boolean {
  const store = useContext(FavoritesStoreContext);
  if (!store) throw new Error('useIsFavorite must be used within FavoritesProvider');
  return useSyncExternalStore(
    store.subscribe,
    () => store.isFavorite(productId),
    () => false
  );
}
