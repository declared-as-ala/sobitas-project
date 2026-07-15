'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Category, SiteNavigationItem } from '@/types';

/**
 * Server-rendered site chrome (header navigation + categories mega-menu), fetched once in the
 * ROOT LAYOUT (services/siteChrome.server.ts) and distributed to the client header components.
 *
 * Consumers (HeaderClient, ProductsDropdown, MobileProductsMenu) treat this as the primary
 * source and only fall back to their legacy fetch-on-mount when a list here is empty (i.e. the
 * server fetch failed). This kills the first-paint flash ("NOS PRODUITS" → "BOUTIQUE") and the
 * 3 redundant client API calls per page view.
 */

export type SiteChromeValue = {
  navigation: { navbar: SiteNavigationItem[]; sidebar: SiteNavigationItem[] };
  categories: Category[];
};

const EMPTY: SiteChromeValue = { navigation: { navbar: [], sidebar: [] }, categories: [] };

const SiteChromeContext = createContext<SiteChromeValue>(EMPTY);

export function SiteChromeProvider({
  navigation,
  categories,
  children,
}: SiteChromeValue & { children: ReactNode }) {
  return (
    <SiteChromeContext.Provider value={{ navigation, categories }}>
      {children}
    </SiteChromeContext.Provider>
  );
}

export function useSiteChrome(): SiteChromeValue {
  return useContext(SiteChromeContext);
}
