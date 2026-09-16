'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AtSign, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthShell, AuthCardHeader, AuthField, AuthSubmit, AuthAlt } from '@/app/components/AuthShell';
import { checkIsAffiliate } from '@/services/affiliatePortal';
import { AffiliatePartnerPanel } from './AffiliatePartnerPanel';

export function AffiliateLoginClient() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState({ login: '', password: '' });
  const [busy, setBusy] = useState(false);

  // Already signed in → straight to the portal; its guard confirms affiliate status.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace('/affiliate');
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login({ login: form.login.trim(), password: form.password });

      // Confirm this account is an APPROVED affiliate before entering the portal.
      const ok = await checkIsAffiliate();
      if (!ok) {
        toast.error('Ce compte n’est pas un compte affilié approuvé.', {
          description: 'Connectez-vous avec votre compte affilié, ou déposez une demande.',
        });
        setBusy(false);
        return;
      }

      toast.success('Bienvenue dans votre espace affilié.');
      router.replace('/affiliate');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connexion impossible. Réessayez.');
      setBusy(false);
    }
  };

  return (
    <AuthShell artwork={<AffiliatePartnerPanel />} artworkLabel="Programme partenaire Protein.tn">
      <AuthCardHeader
        kicker="Espace Partenaire"
        title="Connexion"
        subtitle="Vos ventes, vos commissions et vos paiements, réunis en un seul espace."
      />

      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <AuthField
          label="Email ou téléphone"
          Icon={AtSign}
          type="text"
          inputMode="text"
          placeholder="votre@email.com"
          autoComplete="username"
          value={form.login}
          onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))}
          required
        />

        <AuthField
          label="Mot de passe"
          Icon={KeyRound}
          reveal
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          action={
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-brand transition-colors hover:text-brand-hover"
            >
              Mot de passe oublié ?
            </Link>
          }
          required
        />

        <AuthSubmit loading={busy} loadingLabel="Connexion…">
          Se connecter
        </AuthSubmit>
      </form>

      <div className="mt-4 sm:mt-6">
        <AuthAlt question="Pas encore partenaire ?" href="/partenaires/inscription" cta="Devenez affilié" />
      </div>
    </AuthShell>
  );
}
