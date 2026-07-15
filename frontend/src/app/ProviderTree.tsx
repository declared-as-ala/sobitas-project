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
};

export function ProviderTree({ children, navigation, navCategories }: ProviderTreeProps) {
  return (
    <I18nProvider>
      <SiteChromeProvider navigation={navigation} categories={navCategories}>
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
