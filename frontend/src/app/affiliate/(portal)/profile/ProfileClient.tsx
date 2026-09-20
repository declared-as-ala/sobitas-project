'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { UserCircle, Landmark, Lock, Loader2, Check, BadgeCheck, Clock, Truck, Store } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import {
  getAffiliateProfile, updateAffiliateProfile, requestAffiliatePaymentMethod, AFFILIATE_PAYMENT_METHODS,
  type AffiliateProfile, type AffiliateProfileContact,
} from '@/services/affiliatePortal';
import { ListError } from '../ui';

const CONTACT_FIELDS: { key: keyof AffiliateProfileContact; label: string; placeholder: string; type?: string; full?: boolean }[] = [
  { key: 'name', label: 'Nom complet', placeholder: 'Nom et prénom' },
  { key: 'business_name', label: 'Nom commercial (facultatif)', placeholder: 'Marque / société' },
  { key: 'email', label: 'Email', placeholder: 'vous@email.com', type: 'email' },
  { key: 'phone', label: 'Téléphone', placeholder: '20 000 000', type: 'tel' },
  { key: 'city', label: 'Ville', placeholder: 'Sousse' },
  { key: 'address', label: 'Adresse', placeholder: 'Rue, immeuble…', full: true },
];

const empty: AffiliateProfileContact = { name: '', business_name: '', email: '', phone: '', address: '', city: '' };

export function ProfileClient() {
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [form, setForm] = useState<AffiliateProfileContact>(empty);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payoutBusy, setPayoutBusy] = useState(false);

  const load = () => {
    setError(false);
    getAffiliateProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          name: p.name ?? '', business_name: p.business_name ?? '', email: p.email ?? '',
          phone: p.phone ?? '', address: p.address ?? '', city: p.city ?? '',
        });
      })
      .catch(() => setError(true));
  };
  useEffect(load, []);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return CONTACT_FIELDS.some(({ key }) => (form[key] ?? '') !== (profile[key as keyof AffiliateProfile] ?? ''));
  }, [form, profile]);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateAffiliateProfile(form);
      setProfile(updated);
      toast.success('Coordonnées enregistrées');
    } catch {
      toast.error('Enregistrement impossible. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const requestMethod = async (method: 'bank' | 'cash') => {
    setPayoutBusy(true);
    try {
      const updated = await requestAffiliatePaymentMethod(method);
      setProfile(updated);
      toast.success('Demande envoyée — l’équipe la validera.');
    } catch {
      toast.error('Envoi impossible. Réessayez.');
    } finally {
      setPayoutBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!profile) return;
    setPayoutBusy(true);
    try {
      // Requesting the method already in effect clears the pending request server-side.
      const updated = await requestAffiliatePaymentMethod((profile.payment_method as 'bank' | 'cash') || 'bank');
      setProfile(updated);
      toast.success('Demande annulée.');
    } catch {
      toast.error('Action impossible. Réessayez.');
    } finally {
      setPayoutBusy(false);
    }
  };

  if (error) return (
    <div className="space-y-6">
      <Header />
      <ListError message="Impossible de charger votre profil." onRetry={load} />
    </div>
  );

  if (!profile) return (
    <div className="space-y-6">
      <Header />
      <div className="h-64 animate-pulse rounded-xl border border-hairline bg-elevated" aria-hidden />
    </div>
  );

  return (
    <div className="space-y-6">
      <Header reference={profile.reference} status={profile.status} />

      {/* Contact — editable */}
      <section className="rounded-xl border border-hairline bg-elevated p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand"><UserCircle className="h-4 w-4" aria-hidden /></span>
          <h2 className="text-sm font-bold text-ink-1">Mes coordonnées</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CONTACT_FIELDS.map(({ key, label, placeholder, type, full }) => (
            <label key={key} className={cn('block', full && 'sm:col-span-2')}>
              <span className="mb-1 block text-xs font-semibold text-ink-2">{label}</span>
              <input
                type={type ?? 'text'}
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="h-11 w-full rounded-lg border border-hairline bg-canvas px-3 text-sm text-ink-1 shadow-sm placeholder:text-ink-3 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 font-display text-[13px] font-bold uppercase tracking-[0.06em] text-on-brand shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Enregistrement…</> : <><Check className="h-4 w-4" aria-hidden /> Enregistrer</>}
          </button>
        </div>
      </section>

      {/* Payout — current method + request a change (team approves) */}
      <section className="rounded-xl border border-hairline bg-elevated p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sunken text-ink-2"><Landmark className="h-4 w-4" aria-hidden /></span>
          <h2 className="text-sm font-bold text-ink-1">Informations de paiement</h2>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-hairline bg-elevated px-2 py-0.5 text-[11px] font-semibold text-ink-3">
            <Lock className="h-3 w-3" aria-hidden /> Validé par l’équipe
          </span>
        </div>
        <p className="mb-4 text-xs text-ink-3">
          Vous êtes payé le 1er de chaque mois. Vous pouvez demander une autre méthode ; l’équipe la validera.
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnly
            label="Méthode de paiement actuelle"
            value={profile.payment_method_label
              ?? (profile.payment_method === 'cash' ? 'Retrait au magasin (espèces)' : 'Livraison Aramex (colis)')}
          />
        </dl>

        {profile.payment_method_requested ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warn/40 bg-elevated p-3">
            <span className="inline-flex items-center gap-2 text-sm text-ink-2">
              <Clock className="h-4 w-4 shrink-0 text-warn" aria-hidden />
              Demande en attente&nbsp;: <span className="font-semibold text-ink-1">{profile.payment_method_requested_label}</span>
            </span>
            <button
              type="button"
              onClick={cancelRequest}
              disabled={payoutBusy}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 text-xs font-semibold text-ink-2 transition-colors hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
            >
              {payoutBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null} Annuler la demande
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-ink-2">Demander une autre méthode</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {AFFILIATE_PAYMENT_METHODS.filter((m) => m.value !== profile.payment_method).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => requestMethod(m.value)}
                  disabled={payoutBusy}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-canvas px-4 text-sm font-semibold text-ink-1 shadow-sm transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {payoutBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    : m.value === 'bank' ? <Truck className="h-4 w-4" aria-hidden />
                    : <Store className="h-4 w-4" aria-hidden />}
                  Passer à&nbsp;: {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Header({ reference, status }: { reference?: string | null; status?: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-1 sm:text-3xl">Mon profil</h1>
        {reference && <p className="mt-1 text-sm text-ink-2">Référence affilié : <span className="font-semibold text-ink-1">{reference}</span></p>}
      </div>
      {status === 'active' && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 bg-elevated px-3 py-1 text-xs font-semibold text-ok">
          <BadgeCheck className="h-4 w-4" aria-hidden /> Compte actif
        </span>
      )}
    </div>
  );
}

function ReadOnly({ label, value, mono, full }: { label: string; value: string | null; mono?: boolean; full?: boolean }) {
  return (
    <div className={cn(full && 'sm:col-span-2')}>
      <dt className="mb-1 text-xs font-semibold text-ink-2">{label}</dt>
      <dd className={cn('flex min-h-11 items-center rounded-lg border border-hairline bg-sunken px-3 text-sm text-ink-1', mono && 'font-mono tracking-wide')}>
        {value?.trim() ? value : <span className="text-ink-3">Non renseigné</span>}
      </dd>
    </div>
  );
}
