'use client';

import { BadgeCheck, CircleAlert, Gift, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { VerifiedAvatar } from '@/app/components/VerificationArtwork';

function ContactRow({ icon: Icon, label, value, verified }: {
  icon: typeof Smartphone;
  label: string;
  value?: string;
  verified: boolean;
}) {
  return <div className="flex min-w-0 items-center gap-3 rounded-xl bg-sunken px-3 py-2.5">
    <Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
    <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p><p className="truncate text-sm text-ink-1">{value || 'Non renseigné'}</p></div>
    <span className={verified ? 'text-ok' : 'text-ink-3'} aria-label={verified ? `${label} vérifié` : `${label} non vérifié`}>
      {verified ? <BadgeCheck className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
    </span>
  </div>;
}

export function AccountVerificationCard() {
  const { user } = useAuth();
  if (!user) return null;

  const phoneVerified = !!user.phone_verified;
  const emailVerified = !!user.email_verified;
  const verified = phoneVerified || emailVerified;

  return <section data-account-verification className="mt-4 overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm" aria-labelledby="verification-title">
    <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3.5">
        {verified ? <VerifiedAvatar name={user.name} /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand"><ShieldCheck className="h-6 w-6" /></span>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="verification-title" className="font-display text-lg font-bold uppercase text-ink-1">{phoneVerified ? 'Membre vérifié' : emailVerified ? 'Compte vérifié par email' : 'Compte à vérifier'}</h2>
            <span className={verified ? 'rounded-full border border-ok/30 bg-elevated px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ok' : 'rounded-full bg-brand-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand'}>{verified ? 'Confirmé' : 'Action requise'}</span>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            {phoneVerified
              ? 'Votre numéro suffit : nous ne vous demanderons pas de confirmer votre email.'
              : emailVerified
                ? 'Votre compte est confirmé. Vérifiez maintenant votre téléphone pour renforcer sa sécurité et recevoir les avantages liés au numéro.'
                : 'Confirmez votre téléphone en priorité, ou choisissez la vérification par email.'}
          </p>
        </div>
      </div>
      {!phoneVerified && <LinkWithLoading href="/verify-account" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-display text-sm font-bold uppercase text-on-brand lg:w-auto">
        <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Vérifier mon compte
      </LinkWithLoading>}
    </div>
    <div className="grid gap-2 border-t border-hairline p-4 sm:grid-cols-2 sm:p-5">
      <ContactRow icon={Smartphone} label="Téléphone" value={user.phone} verified={phoneVerified} />
      <ContactRow icon={Mail} label="Email" value={user.email} verified={emailVerified} />
    </div>
    {user.welcome_bonus_eligible && !phoneVerified && <div className="flex items-center gap-3 border-t border-hairline bg-brand-50 px-4 py-3 text-sm text-ink-2 sm:px-5">
      <Gift className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
      <p><strong className="text-ink-1">15 DT vous attendent.</strong> Confirmez votre téléphone pour recevoir 300 Protinas.</p>
    </div>}
  </section>;
}
