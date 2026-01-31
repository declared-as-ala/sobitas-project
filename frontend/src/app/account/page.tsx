import { Metadata } from 'next';
import AccountPage from './AccountPage';

export const metadata: Metadata = {
  title: 'Mon Compte',
  description: 'Gérez votre profil et consultez vos commandes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Account() {
  return <AccountPage />;
}
