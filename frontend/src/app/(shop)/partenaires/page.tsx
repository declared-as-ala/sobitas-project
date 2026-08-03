import type { Metadata } from 'next';
import { buildCanonicalUrl } from '@/util/canonical';
import { PartnersPageClient } from './PartnersPageClient';

/**
 * The public door to a programme that, until now, had none.
 *
 * The partner module (Partner / PartnerCode / PartnerCommissionTransaction / PartnerPayout, plus
 * its own Filament panel) has existed and worked for some time — but entirely inside the admin.
 * Every partner had to be typed in by hand, which is why the programme has the partners it has and
 * no more. This route is the missing half: a coach or a gym can read what the deal is and apply
 * without anyone at SOBITAS touching a keyboard.
 *
 * It is a SERVER component with static metadata and JSON-LD because it is also an acquisition
 * page — "devenir partenaire salle de sport tunisie" is a query with real intent and no incumbent.
 */

const TITLE = 'Programme Partenaire — Coachs & Salles de Sport | Protein.tn';
const DESC =
  'Coach sportif ou salle de sport en Tunisie ? Rejoignez le programme partenaire Protein.tn : code de réduction pour vos clients, commission sur chaque vente, suivi en temps réel. Inscription gratuite.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: buildCanonicalUrl('/partenaires') },
  openGraph: {
    title: { absolute: TITLE },
    description: DESC,
    type: 'website',
    url: buildCanonicalUrl('/partenaires'),
    images: [{ url: '/og-banner.jpg', width: 1200, height: 630, alt: TITLE }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og-banner.jpg'] },
};

export default function PartenairesPage() {
  return <PartnersPageClient />;
}
