'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Phone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { claimWelcomeBonus, sendPhoneVerificationOtp, verifyPhoneOtp, type PhoneVerificationResult } from '@/services/api';
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
  const [delivery, setDelivery] = useState<{ phone: string; expires: number; resend: number } | null>(null);
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
    try {
      const saved = sessionStorage.getItem(`protein:phone-otp:${user.id}`);
      if (saved) {
        const hint = JSON.parse(saved);
        if (typeof hint.phone === 'string' && Number.isFinite(hint.expires) && Number.isFinite(hint.resend)) setDelivery(hint);
      }
    } catch { /* A missing local hint never grants verification. The server decides. */ }
  }, [user?.id, user?.phone]);

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
    try { sessionStorage.removeItem(`protein:phone-otp:${user.id}`); } catch { /* Server result remains authoritative. */ }
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
      const next = { phone: result.phone, expires: now + result.expires_in * 1000, resend: now + result.resend_after * 1000 };
      setDelivery(next);
      setPhone(result.phone);
      setClock(now);
      setCode('');
      try { sessionStorage.setItem(`protein:phone-otp:${user.id}`, JSON.stringify(next)); } catch { /* SMS was sent even if storage is unavailable. */ }
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
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <AuthShell compact artwork={<VerificationPanel kind={complete ? 'success' : 'phone'} />}>
      <div className="mb-3 lg:hidden"><VerificationArtwork kind={complete ? 'success' : 'phone'} compact /></div>
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-elevated p-3 text-sm text-destructive">{error}</p>}
      {complete ? (
        <div data-phone-success className="space-y-4">
          <VerifiedContactBadge label="Téléphone vérifié" />
          <AuthCardHeader title={success?.bonus_awarded ? 'Vos 15 DT sont là' : claimable ? 'Vos 15 DT vous attendent' : 'Téléphone vérifié'} subtitle={awarded ? 'Votre cadeau de 300 points a bien été crédité.' : claimable ? 'Votre numéro est déjà confirmé. Aucun nouveau SMS nécessaire.' : noBonusMessage} />
          {(awarded || claimable) && <div className="rounded-xl border border-hairline bg-sunken p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink-2">{claimable ? 'Cadeau à recevoir' : 'Solde disponible'}</span>
              <strong data-reward-balance className="font-display text-3xl font-bold tracking-tight text-brand">{claimable ? '15' : (success?.points_value_dt ?? user.points_value_dt ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} DT</strong>
            </div>
            <p className="mt-1 text-end text-sm text-ink-2">{claimable ? '300' : success?.points_balance ?? user.points_balance ?? 0} points</p>
          </div>}
          {claimable ? <AuthSubmit type="button" onClick={claim} loading={busy} loadingLabel="Ajout des points…">Recevoir mes 15 DT</AuthSubmit> : <LinkWithLoading href="/account" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mon compte</LinkWithLoading>}
          {(awarded || claimable) && <p className="text-xs leading-relaxed text-ink-2">Utilisables au paiement, jusqu’à 50 % du montant des produits après remises, hors livraison. Un seul cadeau par client et numéro.</p>}
          {!user.email_verified && <LinkWithLoading href="/verify-email" className="flex min-h-11 items-center justify-center rounded-lg px-2 text-sm font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Vérifier aussi mon email</LinkWithLoading>}
        </div>
      ) : (
        <>
          <AuthCardHeader title={delivery ? 'Votre code SMS' : 'Vérifiez votre téléphone'} subtitle={delivery ? `Code envoyé au ${delivery.phone}` : user.welcome_bonus_eligible ? 'Un code SMS pour débloquer vos 15 DT en points.' : 'Confirmez votre numéro avec un code SMS.'} />
          {delivery ? (
            <form onSubmit={verify} className="space-y-4">
              <AuthField label="Code à 6 chiffres" Icon={KeyRound} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required />
              <p className="text-sm text-ink-2" aria-live="off">{remaining > 0 ? `Valable encore ${Math.floor(remaining / 60)} min ${String(remaining % 60).padStart(2, '0')} s` : 'Code expiré. Demandez-en un nouveau.'}</p>
              <AuthSubmit loading={busy} loadingLabel="Vérification…" disabled={!remaining || code.length !== 6}>Confirmer mon téléphone</AuthSubmit>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <button type="button" disabled={busy || cooldown > 0} onClick={() => send()} className="min-h-11 rounded-lg px-2 font-semibold text-brand disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-focus">{cooldown ? `Renvoyer dans ${cooldown} s` : 'Renvoyer le code'}</button>
                <button type="button" disabled={busy} onClick={() => { setDelivery(null); setCode(''); setError(''); try { sessionStorage.removeItem(`protein:phone-otp:${user.id}`); } catch { /* Hint only. */ } }} className="min-h-11 rounded-lg px-2 text-ink-2 focus-visible:ring-2 focus-visible:ring-focus">Corriger le numéro</button>
              </div>
            </form>
          ) : (
            <form onSubmit={send} className="space-y-4">
              <AuthField label="Numéro mobile tunisien" Icon={Phone} type="tel" inputMode="tel" autoComplete="tel" value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} placeholder="20 000 000" required />
              <p className="text-sm text-ink-2">Le code est valable 3 minutes. Ne le communiquez à personne.</p>
              <AuthSubmit loading={busy} loadingLabel="Envoi du SMS…">Recevoir mon code</AuthSubmit>
            </form>
          )}
          <LinkWithLoading href="/account" className="mt-3 flex min-h-11 items-center justify-center rounded-lg px-2 text-sm text-ink-2 focus-visible:ring-2 focus-visible:ring-focus">Plus tard</LinkWithLoading>
        </>
      )}
    </AuthShell>
  );
}
