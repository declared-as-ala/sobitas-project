'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, MailCheck } from 'lucide-react';
import { requestPasswordReset } from '@/services/api';
import { toast } from 'sonner';
import { AuthShell, AuthCardHeader, AuthField, AuthSubmit } from '@/app/components/AuthShell';

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setDone(true);
    } catch (error) {
      /*
        ── THE SAME ANSWER EITHER WAY, ON PURPOSE ──────────────────────────────────────────
        A different message for "no such account" turns this form into an oracle that tells an
        attacker which addresses are customers here. The backend answers with one neutral message
        whatever it finds, so a 4xx/5xx from it must land on the same screen — otherwise the toast
        gives away precisely what the wording hides.

        A request that never REACHED the server is the one honest exception: there is nothing to
        leak, and telling someone their reset mail is on its way when the browser is offline is
        the worst of both.
      */
      const reached = !!(error && typeof error === 'object' && 'response' in error && (error as { response?: unknown }).response);
      if (reached) {
        setDone(true);
      } else {
        toast.error('Connexion impossible. Vérifiez votre réseau et réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {done ? (
        <div>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sunken">
            <MailCheck className="h-6 w-6 text-brand" strokeWidth={2} aria-hidden="true" />
          </div>
          <AuthCardHeader
            title="Vérifiez vos e-mails"
            subtitle={
              <>
                Si un compte est associé à <strong className="font-semibold text-ink-1">{email}</strong>, vous
                recevrez un lien pour choisir un nouveau mot de passe. Il est valable une heure.
              </>
            }
          />
          <p className="mb-6 text-sm leading-relaxed text-ink-2">
            Rien reçu au bout de quelques minutes ? Regardez dans les indésirables, ou
            écrivez-nous à{' '}
            <a
              href="mailto:contact@protein.tn"
              className="rounded font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              contact@protein.tn
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-hairline bg-canvas px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Utiliser une autre adresse
          </button>
        </div>
      ) : (
        <>
          <AuthCardHeader
            kicker="Récupération"
            title="Mot de passe oublié"
            subtitle="Indiquez l’adresse e-mail de votre compte. Nous vous enverrons un lien sécurisé pour en choisir un nouveau."
          />
          <form onSubmit={onSubmit} className="space-y-4">
            <AuthField
              label="Email"
              Icon={Mail}
              type="email"
              inputMode="email"
              placeholder="votre@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AuthSubmit loading={loading} loadingLabel="Envoi…">
              Envoyer le lien
            </AuthSubmit>
          </form>
        </>
      )}

      <Link
        href="/login"
        className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-ink-2 transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour à la connexion
      </Link>
    </AuthShell>
  );
}
