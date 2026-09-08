import type { Order } from '@/types';
import { LEGAL_IDENTITY } from '@/util/company';
import styles from './order-document.module.css';

type Figure = number | string | null | undefined;
export interface DocumentLine {
  id: number;
  produit_id?: number;
  qte?: Figure;
  prix_unitaire?: Figure;
  prix_ttc?: Figure;
  produit?: { designation_fr?: string };
}

// Missing is not zero. In particular, never infer free shipping or a discount from the total.
function number(value: Figure) {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function money(value: Figure) {
  const parsed = number(value);
  return parsed === null ? null : `${parsed.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} DT`;
}

export function OrderDocument({ order, details }: { order: Order; details: DocumentLine[] }) {
  const name = [order.livraison_nom || order.nom, order.livraison_prenom || order.prenom].filter(Boolean).join(' ');
  const phone = order.livraison_phone || order.phone;
  const email = order.livraison_email || order.email;
  const address = [order.livraison_adresse1 || order.adresse1, order.livraison_adresse2 || order.adresse2].filter(Boolean);
  const city = [order.livraison_ville || order.ville, order.livraison_region || order.region].filter(Boolean);
  const postal = order.livraison_code_postale || order.code_postale;
  const date = order.created_at ? new Date(order.created_at) : null;
  // remise is the aggregate HT discount in the house BL. Coupon snapshots are a fallback,
  // never an extra row added to that aggregate (which would count the same reduction twice).
  const discountHt = number(order.remise) ?? number(order.discount_ht);
  const rows = [
    { label: 'Sous-total HT', value: number(order.prix_ht) },
    { label: discountHt === null ? 'Remise TTC' : 'Remise HT', value: discountHt ?? number(order.discount_ttc) },
    { label: 'Livraison', value: number(order.frais_livraison) },
    { label: 'Total de la commande', value: number(order.prix_ttc), total: true },
  ].filter(row => row.value !== null);

  return <article className={styles.document} data-order-document aria-labelledby="order-document-title">
    <header className={styles.header}>
      <div className={styles.company}>
        <p className="font-display text-2xl font-bold uppercase tracking-tight text-ink-1">{LEGAL_IDENTITY.shortLegalName}</p>
        <p className="mt-1 font-semibold text-brand">{LEGAL_IDENTITY.brand}</p>
        <p className="mt-3 text-xs leading-5 text-ink-2">{LEGAL_IDENTITY.legalName}</p>
        <p className="text-xs leading-5 text-ink-2">RC : <bdi dir="ltr">{LEGAL_IDENTITY.registreCommerce}</bdi></p>
        <p className="text-xs leading-5 text-ink-2">MF : <bdi dir="ltr">{LEGAL_IDENTITY.matriculeFiscal}</bdi></p>
      </div>
      <div className={styles.meta}>
        <h1 id="order-document-title" className="font-display text-2xl font-bold uppercase tracking-tight">Bon de commande</h1>
        <dl className="mt-3 space-y-1 text-sm">
          <div><dt className="inline text-ink-2">Référence : </dt><dd className="inline font-semibold"><bdi dir="ltr">{order.numero || order.id}</bdi></dd></div>
          {date && !Number.isNaN(date.getTime()) && <div><dt className="inline text-ink-2">Date : </dt><dd className="inline"><bdi dir="ltr">{date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</bdi></dd></div>}
        </dl>
      </div>
    </header>

    <div className={styles.delivery}>
      <div>
        <h2 className={styles.label}>Client</h2>
        {name && <p className="font-semibold"><bdi dir="auto">{name}</bdi></p>}
        {phone && <p className="mt-1"><bdi dir="ltr">{phone}</bdi></p>}
        {email && <p><bdi dir="ltr">{email}</bdi></p>}
      </div>
      <div>
        <h2 className={styles.label}>Adresse de livraison</h2>
        {address.map((line, i) => <p key={i}><bdi dir="auto">{line}</bdi></p>)}
        {city.length > 0 && <p>{city.map((line, i) => <span key={i}>{i > 0 && ', '}<bdi dir="auto">{line}</bdi></span>)}</p>}
        {postal && <p><bdi dir="ltr">{postal}</bdi></p>}
        {order.pays && <p><bdi dir="auto">{order.pays}</bdi></p>}
      </div>
    </div>

    <table className={styles.items}>
      <caption className="sr-only">Articles du bon de commande, montants en dinars tunisiens</caption>
      <colgroup><col className={styles.productColumn} /><col className={styles.quantityColumn} /><col /><col /></colgroup>
      <thead><tr><th scope="col">Désignation</th><th scope="col">Qté</th><th scope="col">Prix unitaire</th><th scope="col">Montant TTC</th></tr></thead>
      <tbody>{details.map(detail => <tr key={detail.id}>
        <td><bdi dir="auto">{detail.produit?.designation_fr || 'Produit'}</bdi></td>
        <td><bdi dir="ltr">{number(detail.qte)?.toLocaleString('fr-FR') ?? '—'}</bdi></td>
        <td><bdi dir="ltr">{money(detail.prix_unitaire) ?? '—'}</bdi></td>
        <td><bdi dir="ltr">{money(detail.prix_ttc) ?? '—'}</bdi></td>
      </tr>)}</tbody>
    </table>

    <div className={styles.bottom}>
      <div className="min-w-0 text-sm leading-6 text-ink-2">
        {['cod', 'card'].includes(order.payment_method || '') && <div className="mb-4"><h2 className={styles.label}>Paiement</h2><p>{order.payment_method === 'cod' ? 'Paiement à la livraison' : 'Carte bancaire'}</p></div>}
        {order.note && <div><h2 className={styles.label}>Note de livraison</h2><p className="whitespace-pre-wrap"><bdi dir="auto">{order.note}</bdi></p></div>}
      </div>
      <dl className={styles.totals}>{rows.map(row => <div key={row.label} className={row.total ? styles.total : undefined}>
        <dt>{row.label}</dt><dd><bdi dir="ltr">{money(row.value)}</bdi></dd>
      </div>)}</dl>
    </div>
    <footer className={styles.footer}>Bon de commande · {LEGAL_IDENTITY.brand}</footer>
  </article>;
}
