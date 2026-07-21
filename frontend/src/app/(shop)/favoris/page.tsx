import { Metadata } from 'next';
import { FavorisPageClient } from './FavorisPageClient';

export const metadata: Metadata = {
  title: 'Favoris',
  description: 'Vos produits favoris – Proteine Tunisie',
  // Personal wishlist — must not be indexed. This was the only private page with no
  // protection on EITHER layer (no robots meta AND not in robots.txt), so it must stay
  // crawlable (do NOT add to robots.txt disallow) for Googlebot to see this noindex.
  robots: { index: false, follow: false },
};

export default function FavorisPage() {
  return <FavorisPageClient />;
}
