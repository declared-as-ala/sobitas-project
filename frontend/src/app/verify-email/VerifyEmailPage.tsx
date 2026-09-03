'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerificationOtp, verifyEmailOtp } from '@/services/api';
import { AuthCardHeader, AuthField, AuthShell, AuthSubmit } from '@/app/components/AuthShell';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { VerificationArtwork, VerificationPanel, VerifiedContactBadge } from '@/app/components/VerificationArtwork';

type VerificationApiError = {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
};

function verificationError(error: unknown, field: 'code' | 'email', fallback: string) {
  const apiError = error as VerificationApiError;
  return apiError.response?.data?.errors?.[field]?.[0]
    || apiError.response?.data?.message
    || fallback;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshProfile, logout, applyEmailVerification } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [deliveryState, setDeliveryState] = useState<'unknown' | 'sent' | 'failed'>('unknown');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, isLoading, router, user?.email_verified]);

  useEffect(() => {
    try {
      const state = sessionStorage.getItem('protein:verification-email-delivery');
      setDeliveryState(state === 'sent' || state === 'failed' ? state : 'unknown');
    } catch { /* A browser hint, not proof of delivery. */ }
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (isLoading || !isAuthenticated) return <LoadingSpinner />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Saisissez le code à 6 chiffres.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await verifyEmailOtp(code);
      setVerified(result.email_verified);
      if (result.email_verified) applyEmailVerification();
      try { sessionStorage.removeItem('protein:verification-email-delivery'); } catch { /* Server result wins. */ }
      await refreshProfile().catch(() => undefined);
      toast.success(result.message);
    } catch (error: unknown) {
      setError(verificationError(error, 'code', 'Code incorrect ou expiré.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      const result = await sendEmailVerificationOtp();
      try { sessionStorage.setItem('protein:verification-email-delivery', 'sent'); } catch { /* Hint only. */ }
      setDeliveryState('sent');
      setCooldown(60);
      toast.success(result.message);
    } catch (error: unknown) {
      try { sessionStorage.setItem('protein:verification-email-delivery', 'failed'); } catch { /* Hint only. */ }
      setDeliveryState('failed');
      setError(verificationError(error, 'email', 'Envoi impossible. Réessayez.'));
    } finally {
      setResending(false);
    }
  };

  const complete = verified || user?.email_verified;
  return (
    <AuthShell compact artwork={<VerificationPanel kind={complete ? 'success' : 'email'} />}>
      <div className="mb-3 lg:hidden"><VerificationArtwork kind={complete ? 'success' : 'email'} compact /></div>
      {complete ? <div data-email-success className="space-y-4">
        <VerifiedContactBadge label="Email vérifié" />
        <AuthCardHeader title="Votre email est confirmé" subtitle="Retrouvez vos avis et vos achats dans votre espace client." />
        <LinkWithLoading href="/account?section=reviews" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mes avis</LinkWithLoading>
        {!user?.phone_verified && <LinkWithLoading href="/verify-phone" className="flex min-h-11 items-center justify-center rounded-xl border border-brand bg-brand-50 px-4 text-center text-sm font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Vérifier maintenant mon téléphone{user?.welcome_bonus_eligible ? ' et recevoir 15 DT' : ''}</LinkWithLoading>}
        {user?.phone_verified && <LinkWithLoading href="/account" className="flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-sm font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mon compte</LinkWithLoading>}
      </div> : <>
      <AuthCardHeader
        title="Vérifiez votre email"
        subtitle={deliveryState === 'sent'
          ? `Code envoyé à ${user?.email ?? 'votre adresse email'}`
          : deliveryState === 'failed'
            ? 'L’envoi a échoué. Demandez un nouveau code.'
            : 'Saisissez le code reçu ou demandez un nouvel envoi.'}
      />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-elevated p-3 text-sm text-destructive">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Code de vérification"
          Icon={KeyRound}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
        <AuthSubmit loading={submitting} loadingLabel="Vérification…" disabled={resending || code.length !== 6}>
          Vérifier mon email
        </AuthSubmit>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-ink-2">
        <button type="button" onClick={resend} disabled={resending || submitting || cooldown > 0} className="min-h-11 rounded px-2 font-semibold text-brand disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus">
          {resending ? 'Envoi…' : cooldown ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}
        </button>
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.removeItem('protein:verification-email-delivery'); } catch { /* Hint only. */ }
            logout();
            router.replace('/login');
          }}
          disabled={submitting || resending}
          className="min-h-11 rounded px-2 hover:text-ink-1 focus-visible:ring-2 focus-visible:ring-focus"
        >
          Changer de compte
        </button>
      </div>
      <LinkWithLoading href="/verify-account" className="mt-2 flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Choisir la vérification par téléphone</LinkWithLoading>
      </>}
    </AuthShell>
  );
}
