import { Metadata } from 'next';
import { Suspense } from 'react';
import ForgotPasswordClient from './ForgotPasswordClient';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  description: 'Réinitialisez votre mot de passe Proteine Tunisie',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Chargement…</div>}>
      <ForgotPasswordClient />
    </Suspense>
  );
}
