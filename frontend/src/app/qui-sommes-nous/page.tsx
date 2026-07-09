import { Metadata } from 'next';
import { Suspense } from 'react';
import { buildCanonicalUrl } from '@/util/canonical';
import AboutPageClient from './AboutPageClient';

export const metadata: Metadata = {
  title: { absolute: 'À propos | Protéine Tunisie' },
  description: 'Proteine Tunisie, distributeur de compléments alimentaires et matériel de sport à Sousse. Protéines, whey, créatine depuis des années en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/qui-sommes-nous') },
};

export default function QuiSommesNousPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <AboutPageClient />
    </Suspense>
  );
}
