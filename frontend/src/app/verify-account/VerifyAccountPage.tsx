'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BadgeCheck, Mail, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthCardHeader, AuthShell } from '@/app/components/AuthShell';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { VerificationArtwork, VerificationPanel } from '@/app/components/VerificationArtwork';
import { cn } from '@/app/components/ui/utils';

function MethodCard({ href, icon: Icon, title, copy, status, primary = false }: {
  href: string;
  icon: typeof Smartphone;
  title: string;
  copy: string;
  status: string;
  primary?: boolean;
}) {
  return <LinkWithLoading href={href} className={cn(
    'group flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-start transition-[border-color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-focus',
    primary ? 'border-brand bg-brand-50 shadow-sm hover:shadow-card' : 'border-hairline bg-elevated hover:border-rule-strong'
  )}>
    <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', primary ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-2')}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <strong className="font-display text-base uppercase text-ink-1">{title}</strong>
        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', primary ? 'bg-brand text-on-brand' : 'bg-sunken text-ink-3')}>{status}</span>
      </span>
      <span className="mt-1 block text-sm leading-snug text-ink-2">{copy}</span>
    </span>
    <ArrowRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
  </LinkWithLoading>;
}

export default function VerifyAccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?redirect=/verify-account');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !user) return <LoadingSpinner />;

  return <AuthShell compact artwork={<VerificationPanel kind={user.phone_verified ? 'success' : 'phone'} />}>
    <div className="mb-3 lg:hidden"><VerificationArtwork kind={user.phone_verified ? 'success' : 'phone'} compact /></div>
    <AuthCardHeader
      kicker="Sécurité du compte"
      title={user.phone_verified ? 'Compte vérifié' : 'Vérifiez votre compte'}
      subtitle={user.phone_verified
        ? 'Votre téléphone est confirmé. Aucune autre vérification n’est obligatoire.'
        : 'Le téléphone est recommandé. Vous pouvez aussi confirmer votre email.'}
    />

    {user.phone_verified ? <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-ok/30 bg-elevated p-4 text-ok">
        <BadgeCheck className="h-7 w-7 shrink-0" aria-hidden="true" />
        <div><strong className="block text-ink-1">Membre vérifié</strong><span className="text-sm">Téléphone {user.phone}</span></div>
      </div>
      <LinkWithLoading href="/account" className="flex h-12 items-center justify-center rounded-xl bg-brand px-4 font-display text-sm font-bold uppercase text-on-brand">Continuer vers mon compte</LinkWithLoading>
      {!user.email_verified && <MethodCard href="/verify-email" icon={Mail} title="Ajouter mon email" copy="Optionnel : utile pour récupérer votre mot de passe." status="Optionnel" />}
    </div> : <div className="space-y-3">
      <MethodCard href="/verify-phone" icon={Smartphone} title="Par téléphone" copy="Code SMS de 6 chiffres, valable 3 minutes. Débloque les 15 DT offerts." status="Recommandé" primary />
      <MethodCard href="/verify-email" icon={Mail} title="Par email" copy="Confirme le compte, mais votre téléphone restera à vérifier plus tard." status={user.email_verified ? 'Déjà vérifié' : 'Alternative'} />
      {user.email_verified && <div className="flex gap-3 rounded-xl border border-hairline bg-sunken p-3 text-sm text-ink-2"><ShieldCheck className="h-5 w-5 shrink-0 text-ok" /><p>Votre compte est déjà confirmé par email. Ajoutez votre téléphone pour mieux le protéger et recevoir votre cadeau.</p></div>}
    </div>}
  </AuthShell>;
}
