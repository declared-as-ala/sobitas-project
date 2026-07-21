import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * order-confirmation/[id] is a client component with no metadata, so it inherited the homepage
 * <title>. This server layout gives it a correct title and a full noindex/nofollow — an order
 * confirmation is private, per-user content that must never be indexed or crawled.
 */
export const metadata: Metadata = {
  title: 'Confirmation de commande',
  robots: { index: false, follow: false },
};

export default function OrderConfirmationLayout({ children }: { children: ReactNode }) {
  return children;
}
