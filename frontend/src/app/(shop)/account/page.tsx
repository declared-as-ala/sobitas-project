import { Metadata } from 'next';
import AccountPage from './AccountPage';
import { getLatestSportsNutritionResearch } from '@/services/pubmed';

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
  const allowed = ['orders', 'reviews', 'fidelite', 'profile'] as const;
  const section = allowed.find((value) => value === params.section) || 'dashboard';
  const research = await getLatestSportsNutritionResearch();
  return <AccountPage initialSection={section} research={research} />;
}
