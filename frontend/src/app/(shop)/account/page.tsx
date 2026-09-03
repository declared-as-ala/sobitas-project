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

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const params = await searchParams;
  return <AccountPage initialSection={params.section === 'reviews' ? 'reviews' : 'orders'} />;
}
