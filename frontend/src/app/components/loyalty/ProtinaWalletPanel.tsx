import { useId } from 'react';
import { CircleAlert, Gift, Hourglass, PiggyBank, Sparkles, Truck } from 'lucide-react';
import type { ProtinaWalletSummary } from '@/types';
import { formatDt } from '@/util/checkoutPricing';
import { formatProtinaDate, isProtinasV3, pointsToDt, type LoyaltyRules } from '@/util/loyaltyPoints';
import { formatTnd } from '@/util/productPrice';

/**
 * ── ONE TOTAL, TWO WALLETS (PROTINAS V3) ────────────────────────────────────────────────────
 * The header above this panel shows the one number a member checks (« 1 540 Protinas = 77.00 DT »).
 * This panel says what that number is made of, because the two halves follow different rules:
 *
 *   Gagnées     money the member already paid — usable on anything, delivery included, forever;
 *   Cadeau      the shop's money — applied on its own, whole from a basket size, may expire;
 *   En attente  earnings inside the return period, with the date they become spendable;
 *   En route    what open orders will add on delivery.
 *
 * Every figure is `ProtinaWalletService::customerPayload()`; nothing is derived here except the DT
 * value of a count (20 Protinas = 1 DT). Rendered by the account « Fidélité » tab and the member
 * dashboard, which is why it is a component rather than two copies.
 */
function Tile({ icon: Icon, label, points, pointsPerDt, children }: {
  icon: typeof Gift;
  label: string;
  points: number;
  pointsPerDt: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-elevated p-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums text-ink-1">
        {points.toLocaleString('fr-FR')}{' '}
        <span className="text-sm font-semibold text-ink-3">({formatDt(pointsToDt(points, pointsPerDt))})</span>
      </p>
      <p className="mt-1 text-xs leading-snug text-ink-2">{children}</p>
    </div>
  );
}

export function ProtinaWalletPanel({ wallet, rules }: { wallet?: ProtinaWalletSummary | null; rules: LoyaltyRules }) {
  if (!wallet) return null;
  const ppd = Math.max(1, rules.points_per_dt);
  const giftDate = formatProtinaDate(wallet.gift_expires_at);
  const frozenUntil = formatProtinaDate(wallet.gift_frozen_until);
  const pendingDate = formatProtinaDate(wallet.pending_available_at);
  const fullFrom = wallet.gift_full_from_dt ?? rules.gift?.full_from_dt ?? null;
  const giftIsWelcome = wallet.gift_balance === rules.welcome.points;
  const coversDelivery = isProtinasV3(rules) && rules.earned?.cover_shipping !== false;
  // « Sans limite » only where the checkout really lets them pay without a limit: an unverified
  // account or a debt blocks every Protina, and without a phone verified long enough ago (rule 17)
  // they pay at most about half of an order.
  const trustedFrom = formatProtinaDate(wallet.phone_trusted_from);
  const trustDays = Math.max(0, rules.cod?.trusted_phone_days ?? 14);
  const earnedNote = wallet.blocked_reason === 'unverified'
    ? 'À débloquer en vérifiant votre téléphone ou votre email.'
    : wallet.blocked_reason === 'debt'
      ? 'Bloquées jusqu’à ce que le solde à compenser soit remboursé.'
      : !coversDelivery
        ? 'Utilisables sur vos articles.'
        : wallet.phone_trusted === false
          ? trustedFrom
            ? `Sans limite dès le ${trustedFrom}, livraison comprise ; d’ici là, au plus la moitié d’une commande.`
            : `Sans limite ${trustDays > 0 ? `${trustDays} jours après la vérification` : 'dès la vérification'} de votre téléphone ; d’ici là, au plus la moitié d’une commande.`
          : 'Utilisables sans limite, livraison comprise.';
  const giftBlocked = wallet.blocked_reason === 'unverified'
    ? 'À débloquer en vérifiant votre téléphone ou votre email.'
    : wallet.blocked_reason === 'debt'
      ? 'Bloqué tant qu’un solde reste à compenser.'
      : null;

  return (
    <div className="space-y-3" data-protina-wallet="">
      <div className={`grid gap-2.5 min-[420px]:grid-cols-2 ${wallet.earned_pending > 0 ? 'lg:grid-cols-3' : ''}`}>
        <Tile icon={Sparkles} label="Gagnées" points={wallet.earned_spendable} pointsPerDt={ppd}>
          {earnedNote} Elles n&apos;expirent jamais.
        </Tile>
        <Tile icon={Gift} label="Cadeau" points={wallet.gift_balance} pointsPerDt={ppd}>
          {wallet.gift_balance <= 0
            ? 'Aucun cadeau en cours.'
            : <>
                {frozenUntil
                  ? `Suspendu jusqu'au ${frozenUntil} après plusieurs colis refusés.`
                  : giftBlocked
                    ? `${giftBlocked}${giftDate ? ` Expire le ${giftDate}.` : ''}`
                    : giftDate ? `À utiliser avant le ${giftDate}.` : 'Sans date limite.'}
                {' '}{giftIsWelcome && fullFrom ? `En entier dès ${fullFrom} DT d'articles.` : 'S’applique tout seul à vos commandes.'}
              </>}
        </Tile>
        {wallet.earned_pending > 0 && (
          <Tile icon={Hourglass} label="En attente" points={wallet.earned_pending} pointsPerDt={ppd}>
            {pendingDate ? `Disponibles le ${pendingDate} (délai de retour).` : 'Disponibles après le délai de retour.'}
          </Tile>
        )}
      </div>

      {wallet.debt_points > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-warn/40 bg-elevated p-3 text-xs leading-relaxed text-ink-2">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
          <span>Solde à compenser : <strong className="text-ink-1">{wallet.debt_points.toLocaleString('fr-FR')} Protinas</strong>. Vos prochains achats le compensent automatiquement.</span>
        </p>
      )}

      {wallet.en_route.length > 0 && (
        <ul className="space-y-1.5" aria-label="Protinas en route">
          {wallet.en_route.slice(0, 3).map(order => (
            <li key={order.commande_id} className="flex items-start gap-2 text-xs leading-relaxed text-ink-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <span>En route : <strong className="text-ink-1">+{order.points.toLocaleString('fr-FR')} Protinas</strong> à la livraison de la commande <bdi dir="ltr">{order.numero ?? `#${order.commande_id}`}</bdi>.</span>
            </li>
          ))}
        </ul>
      )}

      {wallet.lifetime_savings_dt > 0 && (
        <p className="flex items-center gap-2 text-sm font-semibold text-ink-1" data-protina-savings="">
          <PiggyBank className="h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
          Depuis votre inscription, vous avez économisé {formatDt(wallet.lifetime_savings_dt)}.
        </p>
      )}
    </div>
  );
}

/** « Comment ça marche » — the five rules a member needs, from the published rules, never hard-coded. */
export function ProtinaHowItWorks({ rules, className }: { rules: LoyaltyRules; className?: string }) {
  const titleId = useId();
  const v3 = isProtinasV3(rules);
  const hold = rules.earned?.hold_days ?? 0;
  const fullFrom = rules.gift?.full_from_dt ?? null;
  const welcome = formatTnd(rules.welcome.value_dt);
  const forfeit = rules.refusal?.forfeit_points ?? 400;
  const coversDelivery = v3 && rules.earned?.cover_shipping !== false;
  const steps = [
    `${rules.earn_per_dt} Protina par DT payé pour vos articles, ${hold > 0 ? `disponible ${hold} jours après la livraison` : 'disponible dès la livraison'}.`,
    v3
      ? `${rules.points_per_dt} Protinas = 1 DT, utilisables jusqu'à ${rules.earned?.max_percent ?? 100} % de vos articles${coversDelivery ? ' et la livraison' : ''}.`
      : `${rules.points_per_dt} Protinas = 1 DT de remise sur vos prochaines commandes${(rules.max_total_discount_percent ?? 0) > 0
        ? ` ; code promo ou remise pack + Protinas : jusqu'à ${rules.max_total_discount_percent} % de vos articles` : ''}.`,
    rules.welcome.unlock === 'first_delivered_order'
      ? `Cadeau de bienvenue : ${welcome} crédités quand votre première commande est livrée.`
      : `Cadeau de bienvenue : ${welcome} dès la vérification de votre numéro${fullFrom ? `, en entier dès ${fullFrom} DT d'articles` : ''}.`,
    `Remise pack (${rules.pack.excludes_promo_lines ? 'articles en promo exclus' : 'promos comprises'}) ou code promo : la meilleure des deux s'applique.`,
    ...(v3 ? [`Colis refusé après l'envoi : ${forfeit.toLocaleString('fr-FR')} Protinas retenues pour l'aller-retour, le reste vous est rendu. Annulation avant l'envoi : tout vous est rendu.`] : []),
  ];

  return (
    <section className={className} aria-labelledby={titleId} data-protina-how="">
      <h3 id={titleId} className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">Comment ça marche</h3>
      <ol className="mt-3 space-y-2.5">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-2.5 text-xs leading-relaxed text-ink-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand/40 font-display text-[11px] font-bold tabular-nums text-brand" aria-hidden="true">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
