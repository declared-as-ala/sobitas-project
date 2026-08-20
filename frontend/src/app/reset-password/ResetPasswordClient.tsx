'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { resetPasswordWithToken } from '@/services/api';
import { toast } from 'sonner';
import { AuthShell, AuthCardHeader, AuthField, AuthSubmit } from '@/app/components/AuthShell';

/** The backend rule, mirrored. It said "minimum 6 caractères" on this screen while /register and
 *  the API both required 8 with a letter and a digit — so a customer could be told their new
 *  password was fine and then rejected by the server. */
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Za-z]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre.';
  if (!/[0-9]/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre.';
  return null;
}

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = passwordProblem(password);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (password !== passwordConfirmation) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithToken({
        email: email.trim(),
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      /* It used to toast and stay put, on a form whose fields were now meaningless — the customer
         had no idea whether to press it again. It confirms, then takes them to the login screen
         with their address pre-filled by the query string. */
      setDone(true);
      setTimeout(() => router.replace(`/login?email=${encodeURIComponent(email)}`), 1600);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      toast.error(msg || 'Réinitialisation impossible. Le lien a peut-être expiré — demandez-en un nouveau.');
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <AuthShell>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sunken">
          <ShieldAlert className="h-6 w-6 text-warn" strokeWidth={2} aria-hidden="true" />
        </div>
        <AuthCardHeader
          title="Lien invalide"
          subtitle="Ce lien est incomplet ou a déjà été utilisé. Les liens de réinitialisation expirent au bout d’une heure, pour votre sécurité."
        />
        <Link
          href="/forgot-password"
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Demander un nouveau lien
        </Link>
        <Link
          href="/login"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Retour à la connexion
        </Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sunken">
          <CheckCircle2 className="h-6 w-6 text-ok" strokeWidth={2} aria-hidden="true" />
        </div>
        <AuthCardHeader
          title="Mot de passe enregistré"
          subtitle="Vous pouvez maintenant vous connecter. Nous vous y emmenons."
        />
        <Link
          href={`/login?email=${encodeURIComponent(email)}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-brand px-4 font-display text-[13.5px] font-bold uppercase tracking-[0.08em] text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Se connecter
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCardHeader
        kicker="Sécurité"
        title="Nouveau mot de passe"
        subtitle={
          <>
            Pour le compte <strong className="font-semibold text-ink-1">{email}</strong>.
          </>
        }
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthField
          label="Nouveau mot de passe"
          Icon={Lock}
          reveal
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          hint="Au moins 8 caractères, dont une lettre et un chiffre."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <AuthField
          label="Confirmer"
          Icon={Lock}
          reveal
          placeholder="Retapez le mot de passe"
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
          minLength={8}
        />
        <AuthSubmit loading={loading} loadingLabel="Enregistrement…">
          Enregistrer le mot de passe
        </AuthSubmit>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Retour à la connexion
      </Link>
    </AuthShell>
  );
}
