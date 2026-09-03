import type { Metadata } from 'next';
import VerifyAccountPage from './VerifyAccountPage';

export const metadata: Metadata = {
  title: 'Vérifier mon compte | Protein.tn',
  description: 'Choisissez comment confirmer votre compte Protein.tn.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VerifyAccountPage />;
}
