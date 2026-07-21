import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * cart/page.tsx is a client component with no metadata, so it inherited the homepage <title>.
 * This server layout gives the cart a correct title and marks it noindex — a shopping cart must
 * never be indexed, but should stay crawlable (follow) so links out of it are still discovered.
 */
export const metadata: Metadata = {
  title: 'Panier',
  description: 'Votre panier — Protéine Tunisie',
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
