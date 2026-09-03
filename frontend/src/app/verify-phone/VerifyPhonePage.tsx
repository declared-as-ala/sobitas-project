'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Clock3, KeyRound, LockKeyhole, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { claimWelcomeBonus, getPhoneVerificationStatus, sendPhoneVerificationOtp, verifyPhoneOtp, type PhoneVerificationResult } from '@/services/api';
import { AuthShell, AuthCardHeader, AuthField, AuthSubmit } from '@/app/components/AuthShell';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { VerificationArtwork, VerificationPanel, VerifiedContactBadge } from '@/app/components/VerificationArtwork';

function errorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
  return Object.values(data?.errors ?? {}).flat()[0] || data?.message || 'Connexion interrompue. Réessayez.';
}

export default function VerifyPhonePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshProfile, applyPhoneVerification } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [delivery, setDelivery] = useState<{ phone: string; maskedPhone: string; expires: number; resend: number; attempts: number } | null>(null);
  const [clock, setClock] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<PhoneVerificationResult | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?redirect=/verify-phone');
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!user?.id) return;
    setPhone(user.phone || '');
    if (user.phone_verified) return;
    getPhoneVerificationStatus().then(status => {
      if (!status.active || !status.phone) return;
      const now = Date.now();
      setDelivery({
        phone: status.phone,
        maskedPhone: status.masked_phone || status.phone,
        expires: now + (status.expires_in || 0) * 1000,
        resend: now + (status.resend_after || 0) * 1000,
        attempts: status.attempts_remaining ?? 5,
      });
    }).catch(() => undefined);
  }, [user?.id, user?.phone, user?.phone_verified]);

  useEffect(() => {
    if (!delivery) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [delivery]);

  if (isLoading || !user) return <LoadingSpinner />;
  const remaining = delivery ? Math.max(0, Math.ceil((delivery.expires - clock) / 1000)) : 0;
  const cooldown = delivery ? Math.max(0, Math.ceil((delivery.resend - clock) / 1000)) : 0;
  const complete = !!success || !!user.phone_verified;
  const bonusStatus = success?.bonus_status || user.welcome_bonus_status;
  const claimable = complete && (bonusStatus === 'claimable' || (!bonusStatus && user.welcome_bonus_eligible));
  const awarded = bonusStatus === 'awarded' || success?.bonus_awarded || user.welcome_bonus_awarded;
  const noBonusMessage = bonusStatus === 'already_used'
    ? 'Cette offre a déjà été utilisée avec ces coordonnées. Votre téléphone reste vérifié.'
    : bonusStatus === 'paused' ? 'L’offre de points est momentanément suspendue. Votre téléphone reste vérifié.'
    : 'Votre numéro est bien confirmé. Vous pouvez continuer vos achats.';

  const acceptResult = async (result: PhoneVerificationResult) => {
    setSuccess(result);
    applyPhoneVerification(result);
    setDelivery(null);
    await refreshProfile().catch(() => undefined);
  };

  const claim = async () => {
    setBusy(true);
    setError('');
    try { await acceptResult(await claimWelcomeBonus()); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const send = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await sendPhoneVerificationOtp(phone);
      const now = Date.now();
      if (result.already_verified) {
        await refreshProfile();
        return;
      }
      const next = { phone: result.phone, maskedPhone: result.masked_phone || result.phone, expires: now + result.expires_in * 1000, resend: now + result.resend_after * 1000, attempts: result.attempts_remaining ?? 5 };
      setDelivery(next);
      setPhone(result.phone);
      setClock(now);
      setCode('');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await verifyPhoneOtp(code);
      await acceptResult(result);
    } catch (e) {
      setError(errorMessage(e));
      const status = await getPhoneVerificationStatus().catch(() => null);
      if (status?.active && delivery) setDelivery({ ...delivery, attempts: status.attempts_remaining ?? delivery.attempts });
      else if (status && !status.active) setDelivery(null);
    }
    finally { setBusy(false); }
  };

  return (
    <AuthShell compact artwork={<VerificationPanel kind={complete ? 'success' : 'phone'} />}>
      <div className="mb-3 lg:hidden"><VerificationArtwork kind={complete ? 'success' : 'phone'} compact /></div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-elevated p-3 text-sm text-destructive">{error}</p>}
      {complete ? (
        <div data-phone-success className="space-y-4">
          <VerifiedContactBadge label="Téléphone vérifié" />
          <AuthCardHeader kicker="Vérification terminée" title={success?.bonus_awarded ? 'Vos 15 DT sont là' : claimable ? 'Vos 15 DT vous attendent' : 'Vous êtes vérifié'} subtitle={awarded ? 'Votre cadeau de 300 points a bien été crédité.' : claimable ? 'Votre numéro est déjà confirmé. Aucun nouveau SMS nécessaire.' : noBonusMessage} />
          {(awarded || claimable) && <div className="rounded-xl border border-hairline bg-sunken p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink-2">{claimable ? 'Cadeau à recevoir' : 'Solde disponible'}</span>
              <strong data-reward-balance className="font-display text-3xl font-bold tracking-tight text-brand">{claimable ? '15' : (success?.points_value_dt ?? user.points_value_dt ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} DT</strong>
            </div>
            <p className="mt-1 text-end text-sm text-ink-2">{claimable ? '300' : success?.points_balance ?? user.points_balance ?? 0} points</p>
          </div>}
          {claimable ? <AuthSubmit type="button" onClick={claim} loading={busy} loadingLabel="Ajout des points…">Recevoir mes 15 DT</AuthSubmit> : <LinkWithLoading href="/account" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mon compte</LinkWithLoading>}
          {(awarded || claimable) && <p className="text-xs leading-relaxed text-ink-2">Utilisables au paiement, jusqu’à 50 % du montant des produits après remises, hors livraison. Un seul cadeau par client et numéro.</p>}
          {!user.email_verified && <p className="text-center text-xs text-ink-3">Votre email reste optionnel. Votre compte est déjà vérifié.</p>}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
            <span className="flex items-center gap-2 text-brand"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand">1</span> Téléphone</span>
            <span className="h-px w-8 bg-rule" />
            <span className={delivery ? 'flex items-center justify-end gap-2 text-brand' : 'flex items-center justify-end gap-2'}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-hairline">2</span> Code</span>
          </div>
          <AuthCardHeader kicker="Sécurité du compte" title={delivery ? 'Entrez le code' : 'Vérifiez votre téléphone'} subtitle={delivery ? `SMS envoyé au ${delivery.maskedPhone}` : user.welcome_bonus_eligible ? 'Confirmez votre numéro et recevez immédiatement 15 DT en points.' : 'Confirmez votre numéro avec un code SMS personnel.'} />
          {delivery ? (
            <form onSubmit={verify} className="space-y-4">
              <AuthField label="Code à 6 chiffres" Icon={KeyRound} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000 000" required className="text-center font-display text-2xl font-bold tracking-[0.28em]" />
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sunken px-3 py-2 text-xs text-ink-2" aria-live="polite">
                <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{remaining > 0 ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : 'Code expiré'}</span>
                <span>{delivery.attempts} tentative{delivery.attempts > 1 ? 's' : ''} restante{delivery.attempts > 1 ? 's' : ''}</span>
              </div>
              <AuthSubmit loading={busy} loadingLabel="Vérification…" disabled={!remaining || code.length !== 6}>Confirmer mon téléphone</AuthSubmit>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <button type="button" disabled={busy || cooldown > 0} onClick={() => send()} className="min-h-11 rounded-lg px-2 font-semibold text-brand disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus">{cooldown ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}</button>
                <button type="button" disabled={busy} onClick={() => { setDelivery(null); setCode(''); setError(''); }} className="min-h-11 rounded-lg px-2 text-ink-2 focus-visible:ring-2 focus-visible:ring-focus">Corriger le numéro</button>
              </div>
            </form>
          ) : (
            <form onSubmit={send} className="space-y-4">
              <AuthField label="Numéro mobile tunisien" Icon={Phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} placeholder="20 000 000" required />
              <div className="grid gap-2 rounded-xl border border-hairline bg-sunken p-3 text-xs text-ink-2 sm:grid-cols-2">
                <span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-brand" />Code privé, 3 minutes</span>
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-ok" />Envoi protégé contre les abus</span>
              </div>
              <AuthSubmit loading={busy} loadingLabel="Envoi du SMS…">Recevoir mon code <ArrowRight className="h-4 w-4" /></AuthSubmit>
            </form>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1 text-sm text-ink-2">
            <LinkWithLoading href="/verify-account" className="flex min-h-11 items-center rounded-lg px-2 font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Choisir une autre méthode</LinkWithLoading>
            <span aria-hidden="true">·</span>
            <LinkWithLoading href="/account" className="flex min-h-11 items-center rounded-lg px-2 focus-visible:ring-2 focus-visible:ring-focus">Plus tard</LinkWithLoading>
          </div>
        </>
      )}
    </AuthShell>
  );
}
