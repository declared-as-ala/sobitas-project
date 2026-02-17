'use client';

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';

const STORAGE_KEY = 'sobitas_favoris';

export interface FavoriteProduct {
  id: number;
  designation_fr: string;
  slug?: string;
  cover?: string;
  prix?: number;
  promo?: number | null;
  rupture?: number;
}

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  favoriteProducts: FavoriteProduct[];
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (product: FavoriteProduct) => void;
  addFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (productId: number) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

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
  const favoriteIds = new Set(favoriteProducts.map((p) => p.id));

  useEffect(() => {
    setFavoriteProducts(loadFromStorage());
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
      const next = [...prev, { id: product.id, designation_fr: product.designation_fr, slug: product.slug, cover: product.cover, prix: product.prix, promo: product.promo, rupture: product.rupture }];
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

  const toggleFavorite = useCallback(
    (product: FavoriteProduct) => {
      if (favoriteIds.has(product.id)) {
        removeFavorite(product.id);
      } else {
        addFavorite(product);
      }
    },
    [favoriteProducts, addFavorite, removeFavorite]
  );

  const value: FavoritesContextValue = {
    favoriteIds,
    favoriteProducts,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    count: favoriteProducts.length,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return ctx;
}
