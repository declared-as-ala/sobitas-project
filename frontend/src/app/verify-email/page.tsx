import type { Metadata } from 'next';
import VerifyEmailPage from './VerifyEmailPage';

export const metadata: Metadata = {
  title: 'Vérifier mon email | Protein.tn',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VerifyEmailPage />;
}
