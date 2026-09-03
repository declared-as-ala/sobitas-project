import type { Metadata } from 'next';
import VerifyPhonePage from './VerifyPhonePage';

export const metadata: Metadata = {
  title: 'Vérifier mon téléphone | Protein.tn',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <VerifyPhonePage />;
}
