import type { Metadata } from 'next';
import { AffiliateLoginClient } from './AffiliateLoginClient';

// noindex: the affiliate portal is a private area, never a search result.
export const metadata: Metadata = {
  title: 'Connexion Affilié — Protein.tn',
  robots: { index: false, follow: false },
};

export default function AffiliateLoginPage() {
  return <AffiliateLoginClient />;
}
