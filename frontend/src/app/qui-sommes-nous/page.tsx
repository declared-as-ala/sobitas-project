import { Metadata } from 'next';
import { Suspense } from 'react';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: 'À propos – Proteine Tunisie, Compléments Alimentaires & Sport',
  description: 'Proteine Tunisie, distributeur de compléments alimentaires et matériel de sport à Sousse. Protéines, whey, créatine depuis des années en Tunisie.',
};

export default function QuiSommesNousPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <AboutPageClient />
    </Suspense>
  );
}
