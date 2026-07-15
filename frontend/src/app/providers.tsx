'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { SiteChromeValue } from '@/contexts/SiteChromeContext';

const ProviderTree = dynamic(
  () => import('@/app/ProviderTree').then((m) => ({ default: m.ProviderTree })),
  { ssr: true }
);

type ProvidersProps = {
  children: ReactNode;
  /** Server-fetched header nav + categories + footer chrome (root layout) — see services/siteChrome.server.ts */
  navigation: SiteChromeValue['navigation'];
  navCategories: SiteChromeValue['categories'];
  cmsPages: SiteChromeValue['cmsPages'];
  coordinates: SiteChromeValue['coordinates'];
};

export function Providers({ children, navigation, navCategories, cmsPages, coordinates }: ProvidersProps) {
  return (
    <ProviderTree navigation={navigation} navCategories={navCategories} cmsPages={cmsPages} coordinates={coordinates}>
      {children}
    </ProviderTree>
  );
}
