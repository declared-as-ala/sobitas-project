import { Metadata } from 'next';
import RegisterPage from './RegisterPage';

export const metadata: Metadata = {
  title: 'Inscription - Créer un compte',
  description: 'Créez votre compte sur Sobitas pour profiter de nos services',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Register() {
  return <RegisterPage />;
}
