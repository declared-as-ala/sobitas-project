'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSection } from './ProfileSection';
import { OrdersSection } from './OrdersSection';
import { FidelitySection } from './FidelitySection';
import { ReviewsSection } from './ReviewsSection';
import { AccountPageSkeleton } from './AccountSkeletons';
import { AccountVerificationCard } from './AccountVerificationCard';
import { MemberDashboard } from './MemberDashboard';
import type { PubMedResearchFeed } from '@/services/pubmed';
import { Section } from '@/app/components/layout/Section';

type AccountSection = 'dashboard' | 'orders' | 'reviews' | 'fidelite' | 'profile';

const SECTION_COPY: Record<AccountSection, { eyebrow: string; title: string; description: string }> = {
  dashboard: { eyebrow: 'Vue d’ensemble', title: 'Mon tableau de bord', description: 'Votre activité Protein.tn, réunie au même endroit.' },
  orders: { eyebrow: 'Suivi', title: 'Mes commandes', description: 'Retrouvez vos achats et leur état de livraison.' },
  reviews: { eyebrow: 'Communauté', title: 'Mes avis', description: 'Partagez votre expérience et suivez vos récompenses.' },
  fidelite: { eyebrow: 'Avantages', title: 'Mes points', description: 'Consultez votre cagnotte et chaque mouvement.' },
  profile: { eyebrow: 'Compte', title: 'Mon profil', description: 'Gérez vos informations et votre niveau de vérification.' },
};

export default function AccountPage({ initialSection = 'dashboard', research }: { initialSection?: AccountSection; research: PubMedResearchFeed }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, fetchOrders } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
    // Only fetch once when authenticated, not on every fetchOrders change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  if (isLoading) {
    return <AccountPageSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const copy = SECTION_COPY[initialSection];

  return (
    <main>
    <Section as="div" width="wide" spacing="default" first last>
      {initialSection !== 'dashboard' && (
        <header className="mb-5 border-b border-hairline pb-4 sm:mb-6 sm:pb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand">{copy.eyebrow}</p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-ink-1 sm:text-4xl">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{copy.description}</p>
        </header>
      )}

      {initialSection === 'dashboard' && <MemberDashboard research={research} />}
      {initialSection === 'orders' && <OrdersSection />}
      {initialSection === 'reviews' && <ReviewsSection />}
      {initialSection === 'fidelite' && <FidelitySection />}
      {initialSection === 'profile' && <div className="space-y-5"><AccountVerificationCard /><ProfileSection /></div>}
    </Section>
    </main>
  );
}
