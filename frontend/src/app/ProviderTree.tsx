'use client';

import type { ReactNode } from 'react';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/app/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { QuickOrderProvider } from '@/contexts/QuickOrderContext';
import { SiteChromeProvider, type SiteChromeValue } from '@/contexts/SiteChromeContext';
import { I18nProvider } from '@/i18n/I18nProvider';

type ProviderTreeProps = {
  children: ReactNode;
  navigation: SiteChromeValue['navigation'];
  navCategories: SiteChromeValue['categories'];
  cmsPages: SiteChromeValue['cmsPages'];
  coordinates: SiteChromeValue['coordinates'];
};

export function ProviderTree({ children, navigation, navCategories, cmsPages, coordinates }: ProviderTreeProps) {
  return (
    <I18nProvider>
      <SiteChromeProvider navigation={navigation} categories={navCategories} cmsPages={cmsPages} coordinates={coordinates}>
        <LoadingProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <QuickOrderProvider>{children}</QuickOrderProvider>
              </FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </LoadingProvider>
      </SiteChromeProvider>
    </I18nProvider>
  );
}
