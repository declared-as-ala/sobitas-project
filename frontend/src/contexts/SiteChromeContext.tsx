'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Category, Coordinate, SiteNavigationItem } from '@/types';
import type { CmsPage } from '@/services/api';

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
  cmsPages: CmsPage[];
  coordinates: Coordinate | null;
};

const EMPTY: SiteChromeValue = { navigation: { navbar: [], sidebar: [] }, categories: [], cmsPages: [], coordinates: null };

const SiteChromeContext = createContext<SiteChromeValue>(EMPTY);

export function SiteChromeProvider({
  navigation,
  categories,
  cmsPages,
  coordinates,
  children,
}: SiteChromeValue & { children: ReactNode }) {
  return (
    <SiteChromeContext.Provider value={{ navigation, categories, cmsPages, coordinates }}>
      {children}
    </SiteChromeContext.Provider>
  );
}

export function useSiteChrome(): SiteChromeValue {
  return useContext(SiteChromeContext);
}
