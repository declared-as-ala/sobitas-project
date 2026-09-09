'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock3, KeyRound, Mail, Send, ShieldCheck, Smartphone } from 'lucide-react';
import { AuthField, AuthSubmit } from '@/app/components/AuthShell';
import type { OtpChallenge } from '@/services/affiliateProgram';
import { BackButton, DemoNotice, ErrorNote, StepHeading } from './signupUi';

/**
 * Steps 4 and 5 — the two confirmation codes.
 *
 * ── ONE COMPONENT, TWO CHANNELS ───────────────────────────────────────────────────────────
 * SMS and e-mail differ in three strings and one icon. Two components would be two places to fix
 * the countdown, the cooldown and the attempts counter — and the storefront already learned that
 * lesson: /verify-phone and /verify-email are near-identical files, and the pattern below is
 * lifted from the phone one because it has been in production and works.
 *
 * ── THE CODE IS NOT SENT UNTIL SOMEBODY ASKS ──────────────────────────────────────────────
 * Sending on mount would be one tap fewer and a real cost: every accidental back-navigation into
 * this step is an SMS, and an SMS to a Tunisian mobile is money. The first screen therefore
 * states what is about to happen, shows the destination so a typo is caught BEFORE the send, and
 * asks for a deliberate tap.
 *
 * ── WHAT THE COUNTDOWN IS FOR ─────────────────────────────────────────────────────────────
 * Three numbers, all of which prevent a support call: how long the code is still valid, how many
 * tries are left, and when "Renvoyer" becomes available. Without the last one, a code that has
 * not arrived produces a visitor tapping a disabled button and concluding the site is broken.
 */

export function StepOtp({
  channel,
  destination,
  verified,
  challenge,
  onSend,
  onVerify,
  onContinue,
  onBack,
  busy,
  serverError,
  continueLabel,
}: {
  channel: 'phone' | 'email';
  /** Masked, as the server returns it. The full value is never echoed back to the page. */
  destination: string;
  verified: boolean;
  challenge: OtpChallenge | null;
  onSend: () => void;
  onVerify: (code: string) => void;
  /** Called from the confirmed state. On the e-mail step this submits the whole application. */
  onContinue: () => void;
  onBack: () => void;
  busy: boolean;
  serverError: string | null;
  continueLabel: string;
}) {
  const [code, setCode] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // The challenge arrives with RELATIVE seconds; the deadlines are pinned once, when it arrives,
  // so a slow render or a backgrounded tab cannot make the countdown drift.
  const deadlines = useRef<{ expiresAt: number; resendAt: number } | null>(null);
  useEffect(() => {
    if (!challenge) {
      deadlines.current = null;
      return;
    }
    const base = Date.now();
    deadlines.current = {
      expiresAt: base + challenge.expires_in * 1000,
      resendAt: base + challenge.resend_after * 1000,
    };
    setCode('');
    setNow(base);
  }, [challenge]);

  useEffect(() => {
    if (!challenge) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [challenge]);

  const remaining = deadlines.current ? Math.max(0, Math.ceil((deadlines.current.expiresAt - now) / 1000)) : 0;
  const cooldown = deadlines.current ? Math.max(0, Math.ceil((deadlines.current.resendAt - now) / 1000)) : 0;

  const Icon = channel === 'phone' ? Smartphone : Mail;
  const noun = channel === 'phone' ? 'numéro' : 'adresse e-mail';
  const via = channel === 'phone' ? 'par SMS' : 'par e-mail';

  /* ── Confirmed ───────────────────────────────────────────────────────────────────────── */
  if (verified) {
    return (
      <div>
        <StepHeading title={channel === 'phone' ? 'Téléphone confirmé' : 'E-mail confirmé'}>
          {channel === 'phone'
            ? 'Votre numéro est vérifié. Encore une étape.'
            : 'Tout est vérifié. Il ne reste qu’à envoyer votre demande.'}
        </StepHeading>

        {serverError && <ErrorNote>{serverError}</ErrorNote>}

        <p className="mb-5 flex items-center gap-3 rounded-xl border border-ok/40 bg-elevated p-4 text-sm text-ink-1">
          <ShieldCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden />
          <span>
            <strong className="block font-semibold">{destination}</strong>
            <span className="text-ink-2">Confirmé</span>
          </span>
        </p>

        <AuthSubmit type="button" onClick={onContinue} loading={busy} loadingLabel="Envoi de votre demande…">
          {continueLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </AuthSubmit>
      </div>
    );
  }

  /* ── Before the send ─────────────────────────────────────────────────────────────────── */
  if (!challenge) {
    return (
      <div>
        <BackButton onClick={onBack} label={`Corriger mon ${noun}`} />

        <div className="mt-3">
          <StepHeading title={channel === 'phone' ? 'Confirmez votre téléphone' : 'Confirmez votre e-mail'}>
            Nous allons vous envoyer un code à 6 chiffres {via}. Vérifiez que le {noun} ci-dessous
            est le bon.
          </StepHeading>
        </div>

        {serverError && <ErrorNote>{serverError}</ErrorNote>}

        <p className="mb-5 flex items-center gap-3 rounded-xl border border-hairline bg-sunken p-4">
          <Icon className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          <span className="min-w-0">
            <span className="block font-display text-lg font-extrabold tracking-tight text-ink-1">
              {destination}
            </span>
            <span className="text-xs text-ink-3">
              Ce n’est pas le bon ? Revenez en arrière pour le corriger.
            </span>
          </span>
        </p>

        <AuthSubmit type="button" onClick={onSend} loading={busy} loadingLabel="Envoi du code…">
          <Send className="h-4 w-4" aria-hidden />
          Recevoir mon code
        </AuthSubmit>
      </div>
    );
  }

  /* ── Waiting for the code ────────────────────────────────────────────────────────────── */
  const expired = remaining === 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6 && !expired) onVerify(code);
      }}
      noValidate
    >
      <BackButton onClick={onBack} label={`Corriger mon ${noun}`} />

      <div className="mt-3">
        <StepHeading title="Entrez votre code">
          Nous avons envoyé un code à 6 chiffres {via} à{' '}
          <strong className="font-semibold text-ink-1">{destination}</strong>.
        </StepHeading>
      </div>

      {challenge.demo_code && <DemoNotice code={challenge.demo_code} />}
      {serverError && <ErrorNote>{serverError}</ErrorNote>}

      {/* `autoFocus` rather than a ref: AuthField is a plain function component, so a ref would
          land on nothing and warn. The keyboard opening on the code field is the right default —
          it is the only thing on the screen to do. */}
      <AuthField
        autoFocus
        label="Code à 6 chiffres"
        Icon={KeyRound}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        pattern="[0-9]{6}"
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="text-center font-display text-2xl font-bold tracking-[0.28em]"
        required
      />

      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sunken px-3 py-2 text-xs text-ink-2"
        aria-live="polite"
      >
        <span className="flex items-center gap-1.5">
          <Clock3 className="h-4 w-4" aria-hidden />
          {expired
            ? 'Code expiré'
            : `Valable ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`}
        </span>
        <span>
          {challenge.attempts_remaining} tentative{challenge.attempts_remaining > 1 ? 's' : ''} restante
          {challenge.attempts_remaining > 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-5">
        <AuthSubmit loading={busy} loadingLabel="Vérification…" disabled={expired || code.length !== 6}>
          Confirmer
          <ArrowRight className="h-4 w-4" aria-hidden />
        </AuthSubmit>
      </div>

      <div className="mt-2 flex justify-center">
        <button
          type="button"
          onClick={onSend}
          disabled={busy || (cooldown > 0 && !expired)}
          className="min-h-[44px] rounded-lg px-3 text-sm font-semibold text-brand transition-colors [@media(hover:hover)]:hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:text-ink-3"
        >
          {cooldown > 0 && !expired ? `Renvoyer le code dans ${cooldown} s` : 'Je n’ai rien reçu, renvoyer'}
        </button>
      </div>
    </form>
  );
}
