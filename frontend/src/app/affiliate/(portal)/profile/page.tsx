import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';

export const metadata: Metadata = {
  title: 'Mon profil — Affilié',
  robots: { index: false, follow: false },
};

export default function AffiliateProfilePage() {
  return <ProfileClient />;
}
