'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load drawer to avoid circular dependency: QuickOrderDrawer imports from this file
const QuickOrderDrawer = dynamic(
  () => import('@/app/components/QuickOrderDrawer').then((m) => ({ default: m.QuickOrderDrawer })),
  { ssr: false }
);

/** Minimal product shape for quick order (from card or detail page) */
export interface QuickOrderProduct {
  id: number;
  designation_fr: string;
  slug?: string;
  cover?: string;
  prix: number;
  promo?: number | null;
  promo_expiration_date?: string | null;
  rupture?: number;
  aromes?: { id: number; designation_fr: string }[];
}

interface QuickOrderState {
  product: QuickOrderProduct | null;
  initialQty: number;
  initialVariantId: number | undefined;
}

interface QuickOrderContextValue {
  openQuickOrder: (product: QuickOrderProduct, options?: { initialQty?: number; initialVariantId?: number }) => void;
  closeQuickOrder: () => void;
}

const QuickOrderContext = createContext<QuickOrderContextValue | null>(null);

export function useQuickOrder(): QuickOrderContextValue {
  const ctx = useContext(QuickOrderContext);
  if (!ctx) {
    throw new Error('useQuickOrder must be used within QuickOrderProvider');
  }
  return ctx;
}

/** Client-only provider: use via <Providers> in layout, not directly in server layout. */
export function QuickOrderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuickOrderState>({
    product: null,
    initialQty: 1,
    initialVariantId: undefined,
  });
  const [open, setOpen] = useState(false);

  const openQuickOrder = useCallback(
    (product: QuickOrderProduct, options?: { initialQty?: number; initialVariantId?: number }) => {
      setState({
        product,
        initialQty: options?.initialQty ?? 1,
        initialVariantId: options?.initialVariantId,
      });
      setOpen(true);
    },
    []
  );

  const closeQuickOrder = useCallback(() => {
    setOpen(false);
    setTimeout(() => setState((prev) => ({ ...prev, product: null })), 250);
  }, []);

  return (
    <QuickOrderContext.Provider value={{ openQuickOrder, closeQuickOrder }}>
      {children}
      {state.product != null && (
        <QuickOrderDrawer
          open={open}
          onOpenChange={(next) => !next && closeQuickOrder()}
          product={state.product}
          initialQty={state.initialQty}
          initialVariantId={state.initialVariantId}
        />
      )}
    </QuickOrderContext.Provider>
  );
}
