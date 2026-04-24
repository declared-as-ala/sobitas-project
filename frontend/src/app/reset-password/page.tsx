import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe',
  description: 'Définissez un nouveau mot de passe pour votre compte',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
