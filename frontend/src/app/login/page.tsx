import { Metadata } from 'next';
import LoginPageClient from './LoginPageClient';

export const metadata: Metadata = {
  title: 'Connexion - SOBITAS',
  description: 'Connectez-vous à votre compte SOBITAS pour accéder à vos commandes et profiter de nos services.',
};

export default function LoginPage() {
  return <LoginPageClient />;
}
