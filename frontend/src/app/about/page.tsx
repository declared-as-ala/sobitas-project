import { Metadata } from 'next';
import { Suspense } from 'react';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: 'À propos – SOBITAS, Compléments Alimentaires & Sport en Tunisie',
  description: 'SOBITAS, distributeur de compléments alimentaires et matériel de sport à Sousse. Protéines, whey, créatine depuis des années en Tunisie.',
};

export default function AboutPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <AboutPageClient />
    </Suspense>
  );
}
