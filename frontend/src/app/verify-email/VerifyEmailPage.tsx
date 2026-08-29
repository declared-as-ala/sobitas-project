'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sendEmailVerificationOtp, verifyEmailOtp } from '@/services/api';
import { AuthCardHeader, AuthField, AuthShell, AuthSubmit } from '@/app/components/AuthShell';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';

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
  const { user, isAuthenticated, isLoading, refreshProfile, logout } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [deliveryState, setDeliveryState] = useState<'unknown' | 'sent' | 'failed'>('unknown');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
    if (!isLoading && user?.contact_verified) router.replace('/');
  }, [isAuthenticated, isLoading, router, user?.contact_verified]);

  useEffect(() => {
    const state = sessionStorage.getItem('protein:verification-email-delivery');
    setDeliveryState(state === 'sent' || state === 'failed' ? state : 'unknown');
  }, []);

  if (isLoading || !isAuthenticated) return <LoadingSpinner />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Saisissez le code à 6 chiffres.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await verifyEmailOtp(code);
      sessionStorage.removeItem('protein:verification-email-delivery');
      await refreshProfile();
      toast.success(result.message);
      router.replace('/');
    } catch (error: unknown) {
      toast.error(verificationError(error, 'code', 'Code incorrect ou expiré.'));
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      const result = await sendEmailVerificationOtp();
      sessionStorage.setItem('protein:verification-email-delivery', 'sent');
      setDeliveryState('sent');
      toast.success(result.message);
    } catch (error: unknown) {
      sessionStorage.setItem('protein:verification-email-delivery', 'failed');
      setDeliveryState('failed');
      toast.error(verificationError(error, 'email', 'Envoi impossible. Réessayez.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell>
      <AuthCardHeader
        title="Vérifiez votre email"
        subtitle={deliveryState === 'sent'
          ? `Code envoyé à ${user?.email ?? 'votre adresse email'}`
          : deliveryState === 'failed'
            ? 'L’envoi a échoué. Demandez un nouveau code.'
            : 'Saisissez le code reçu ou demandez un nouvel envoi.'}
      />
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
        <AuthSubmit loading={submitting} loadingLabel="Vérification…" disabled={resending}>
          Vérifier mon email
        </AuthSubmit>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-ink-2">
        <button type="button" onClick={resend} disabled={resending} className="min-h-11 rounded px-2 font-semibold text-brand disabled:opacity-50">
          {resending ? 'Envoi…' : 'Renvoyer le code'}
        </button>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('protein:verification-email-delivery');
            logout();
            router.replace('/login');
          }}
          className="min-h-11 rounded px-2 hover:text-ink-1"
        >
          Changer de compte
        </button>
      </div>
    </AuthShell>
  );
}
