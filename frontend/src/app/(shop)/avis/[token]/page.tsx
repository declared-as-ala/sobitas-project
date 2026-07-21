import type { Metadata } from 'next';
import AvisClient from './AvisClient';

// Private, per-order review link — never indexed.
export const metadata: Metadata = {
  title: 'Donnez votre avis',
  description: 'Notez les produits de votre commande.',
  robots: { index: false, follow: false },
};

export default async function AvisPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <AvisClient token={token} />;
}
