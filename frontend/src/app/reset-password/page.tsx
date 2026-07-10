import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe',
  description: 'Définissez un nouveau mot de passe pour votre compte',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement..." />}>
      <ResetPasswordClient />
    </Suspense>
  );
}
