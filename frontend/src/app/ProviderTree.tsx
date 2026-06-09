'use client';

import type { ReactNode } from 'react';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/app/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import { QuickOrderProvider } from '@/contexts/QuickOrderContext';
import { I18nProvider } from '@/i18n/I18nProvider';

export function ProviderTree({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <LoadingProvider>
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <QuickOrderProvider>{children}</QuickOrderProvider>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </LoadingProvider>
    </I18nProvider>
  );
}
