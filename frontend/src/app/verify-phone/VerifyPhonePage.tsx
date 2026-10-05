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
import { FALLBACK_LOYALTY_RULES, formatProtinaDate, isProtinasV3, loadLoyaltyRules, welcomeOffer, type LoyaltyRules } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';

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
  const [rules, setRules] = useState<LoyaltyRules>(FALLBACK_LOYALTY_RULES);
  useEffect(() => { void loadLoyaltyRules().then(setRules); }, []);

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
  const pending = bonusStatus === 'pending' || !!success?.bonus_pending;
  const awarded = bonusStatus === 'awarded' || success?.bonus_awarded || user.welcome_bonus_awarded;
  const noBonusMessage = bonusStatus === 'already_used'
    ? `Ce numéro a déjà reçu le cadeau de bienvenue. Vous gagnez ${rules.earn_per_dt} Protina par DT à chaque commande livrée.`
    : bonusStatus === 'paused' ? 'L’offre de points est momentanément suspendue. Votre téléphone reste vérifié.'
    : 'Votre numéro est bien confirmé. Vous pouvez continuer vos achats.';
  /*
   * ── PROTINAS V3: THE GIFT IS CREDITED AT THIS MOMENT ────────────────────────────────────────
   * Since 02/10/2026 the 300 gift Protinas land in the account the second the code is accepted
   * (WELCOME_BONUS_UNLOCK_ON_DELIVERY defaults to false), so the success screen says so and sends
   * the customer shopping. The `pending` branch only exists for that switch turned back on.
   */
  const giftValue = formatTnd(rules.welcome.value_dt);
  const giftPoints = (success?.bonus_points || rules.welcome.points).toLocaleString('fr-FR');
  const giftExpires = formatProtinaDate(success?.bonus_expires_at ?? user.protinas?.gift_expires_at);
  /* Auto-apply, delivery and « en entier dès X DT » are v3 rules. Under the v2 rollback (or a pre-v3
     backend, which publishes no version) the gift is spent by hand, on the articles only, under the
     per-order ceiling — RegisterPage gates the same sentence the same way. */
  const v3 = isProtinasV3(rules);
  const giftFullFrom = v3 ? success?.gift_full_from_dt ?? user.protinas?.gift_full_from_dt ?? rules.gift?.full_from_dt ?? null : null;
  const v2Ceiling = rules.max_total_discount_percent;
  const v2Use = `${rules.points_per_dt} Protinas = 1 DT, utilisables sur vos articles${v2Ceiling ? ` dans la limite de ${v2Ceiling} % par commande` : ''}`;
  const awardedBody = v3
    ? `${giftPoints} Protinas cadeau viennent d’être ajoutées à votre compte. Elles s’appliquent toutes seules à votre prochaine commande${giftFullFrom ? ` : les ${giftValue} en entier dès ${giftFullFrom} DT d’articles, et elles peuvent aussi régler la livraison` : ', livraison comprise'}.${giftExpires ? ` À utiliser avant le ${giftExpires}.` : ''}`
    : `${giftPoints} Protinas cadeau viennent d’être ajoutées à votre compte : ${v2Use}.${giftExpires ? ` À utiliser avant le ${giftExpires}.` : ''}`;

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
          <AuthCardHeader kicker="Vérification terminée" title={awarded ? `Vos ${giftValue} sont là` : pending ? `Vos ${giftValue} en attente` : claimable ? `Vos ${giftValue} vous attendent` : 'Vous êtes vérifié'} subtitle={pending ? `Téléphone vérifié. Vos ${giftPoints} Protinas (${giftValue}) arriveront quand votre première commande sera livrée.` : awarded ? awardedBody : claimable ? 'Votre numéro est déjà confirmé. Aucun nouveau SMS nécessaire.' : noBonusMessage} />
          {(awarded || claimable) && <div className="rounded-xl border border-hairline bg-sunken p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink-2">{claimable ? 'Cadeau à recevoir' : 'Solde disponible'}</span>
              <strong data-reward-balance className="font-display text-3xl font-bold tracking-tight text-brand">{claimable ? '15' : (success?.points_value_dt ?? user.points_value_dt ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 })} DT</strong>
            </div>
            <p className="mt-1 text-end text-sm text-ink-2">{claimable ? '300' : success?.points_balance ?? user.points_balance ?? 0} Protinas</p>
          </div>}
          {claimable
            ? <AuthSubmit type="button" onClick={claim} loading={busy} loadingLabel="Ajout des Protinas…">Recevoir mes {giftValue}</AuthSubmit>
            : awarded
              ? <>
                  <LinkWithLoading href="/shop" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus-visible:ring-2 focus-visible:ring-focus">Faire mes achats</LinkWithLoading>
                  <LinkWithLoading href="/account" className="flex min-h-11 items-center justify-center rounded-lg px-2 text-center text-sm font-semibold text-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mon compte</LinkWithLoading>
                </>
              : <LinkWithLoading href="/account" className="flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus-visible:ring-2 focus-visible:ring-focus">Voir mon compte</LinkWithLoading>}
          {(awarded || claimable || pending) && <p className="text-xs leading-relaxed text-ink-2">{giftPoints} Protinas cadeau ({giftValue}), une seule fois par compte et par numéro. {v3 ? 'Elles s’appliquent toutes seules à votre commande, livraison comprise.' : `${v2Use}.`}</p>}
          {!user.email_verified && <p className="text-center text-xs text-ink-3">Votre email reste optionnel. Votre compte est déjà vérifié.</p>}
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
            <span className="flex items-center gap-2 text-brand"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-on-brand">1</span> Téléphone</span>
            <span className="h-px w-8 bg-rule" />
            <span className={delivery ? 'flex items-center justify-end gap-2 text-brand' : 'flex items-center justify-end gap-2'}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-hairline">2</span> Code</span>
          </div>
          <AuthCardHeader kicker="Sécurité du compte" title={delivery ? 'Entrez le code' : 'Vérifiez votre téléphone'} subtitle={delivery ? `SMS envoyé au ${delivery.maskedPhone}` : user.welcome_bonus_eligible ? `Vérifiez votre numéro : ${welcomeOffer(rules)}` : 'Confirmez votre numéro avec un code SMS personnel.'} />
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
