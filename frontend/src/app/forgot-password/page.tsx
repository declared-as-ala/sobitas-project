import { Metadata } from 'next';
import { Suspense } from 'react';
import ForgotPasswordClient from './ForgotPasswordClient';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  description: 'Réinitialisez votre mot de passe Proteine Tunisie',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement..." />}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
