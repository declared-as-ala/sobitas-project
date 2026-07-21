import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * account/orders/[id] is a client component with no metadata (the parent account/orders list already
 * sets noindex, but this [id] child needs its own). Private order detail — noindex/nofollow + a title.
 */
export const metadata: Metadata = {
  title: 'Détail de la commande',
  robots: { index: false, follow: false },
};

export default function OrderDetailLayout({ children }: { children: ReactNode }) {
  return children;
}
