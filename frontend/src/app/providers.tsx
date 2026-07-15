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
  /** Server-fetched header nav + categories (root layout) — see services/siteChrome.server.ts */
  navigation: SiteChromeValue['navigation'];
  navCategories: SiteChromeValue['categories'];
};

export function Providers({ children, navigation, navCategories }: ProvidersProps) {
  return (
    <ProviderTree navigation={navigation} navCategories={navCategories}>
      {children}
    </ProviderTree>
  );
}
