import { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Connexion - Proteine Tunisie',
  description: 'Connectez-vous à votre compte Proteine Tunisie pour accéder à vos commandes et profiter de nos services.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
