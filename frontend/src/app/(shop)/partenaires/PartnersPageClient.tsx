'use client';

/**
 * Programme partenaire — the acquisition page for coaches and gyms.
 *
 * ── WHY THE PAGE IS ORDERED LIKE THIS ──────────────────────────────────────────────────────
 * A coach reading this is deciding one thing: "is this worth my clients' trust?" So the page
 * answers, in order, the three questions that decision is made of — what do I get, what do my
 * clients get, what does it cost me — and only then asks for their details. The form is last on
 * purpose. Leading with a form asks for commitment before the offer has been made.
 *
 * The audience switch at the top is not decoration: a coach and a gym owner are different buyers
 * with different objections (a coach worries about looking like a salesperson; a gym worries about
 * stock and margin), and the copy changes under them. One page, two arguments, one canonical URL —
 * rather than two thin pages competing for the same query.
 *
 * ── STATUS ────────────────────────────────────────────────────────────────────────────────
 * Submission posts to the public application endpoint and creates a PENDING partner. Nothing here
 * grants access, sets a commission rate, or issues a code — an application is a request, and an
 * admin approves it in Filament. That separation is deliberate and is what makes it safe for this
 * form to be public at all.
 */

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/app/components/PageHeader';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Button } from '@/app/components/ui/button';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { applyAsPartner, type PartnerApplication } from '@/services/partners';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Dumbbell,
  Link2,
  Loader2,
  Percent,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserRound,
  Wallet,
} from 'lucide-react';

type PartnerType = 'coach' | 'gym';

const AUDIENCE: Record<
  PartnerType,
  { label: string; icon: typeof UserRound; pitch: string; nameLabel: string; namePlaceholder: string }
> = {
  coach: {
    label: 'Coach sportif',
    icon: UserRound,
    pitch:
      "Vos clients vous demandent déjà quoi prendre. Donnez-leur un code de réduction à votre nom — ils économisent, vous êtes rémunéré, et vous ne vendez rien vous-même.",
    nameLabel: 'Votre nom complet',
    namePlaceholder: 'Ex. Ali Ben Salah',
  },
  gym: {
    label: 'Salle de sport',
    icon: Building2,
    pitch:
      "Vos adhérents achètent leurs compléments ailleurs. Récupérez cette valeur sans gérer de stock, sans avancer de trésorerie et sans rayon à tenir.",
    nameLabel: 'Nom de la salle',
    namePlaceholder: 'Ex. Iron Gym Sousse',
  },
};

const STEPS = [
  {
    icon: BadgeCheck,
    title: 'Vous candidatez',
    body: "Deux minutes, sans engagement. Nous vérifions votre profil et revenons vers vous rapidement.",
  },
  {
    icon: Tag,
    title: 'Vous recevez votre code',
    body: "Un code de réduction à votre nom, que vos clients utilisent au paiement. Ils économisent immédiatement.",
  },
  {
    icon: Wallet,
    title: 'Vous êtes rémunéré',
    body: "Une commission sur chaque commande passée avec votre code. Suivi en temps réel, versement sur votre compte.",
  },
];

const BENEFITS = [
  { icon: Percent, title: 'Vos clients économisent', body: 'Une remise réelle à leur nom, pas un code générique trouvable partout.' },
  { icon: TrendingUp, title: 'Suivi transparent', body: 'Chaque vente, chaque commission et chaque versement, visibles dans votre espace.' },
  { icon: ShieldCheck, title: 'Aucun stock, aucune avance', body: "Nous gérons la commande, le paiement, la livraison et le service client." },
  { icon: Link2, title: 'Code ou lien', body: 'Partagez un code à dicter en salle, ou un lien à poster — les deux vous sont attribués.' },
];

const CITIES = [
  'Tunis', 'Ariana', 'Ben Arous', 'La Manouba', 'Nabeul', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef',
  'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
  'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili', 'Zaghouan',
];

/** Tunisian mobile numbers are 8 digits, optionally prefixed +216. Spaces are tolerated. */
const PHONE_RE = /^(?:\+?216)?[\s.-]?[2459]\d{1}[\s.-]?\d{3}[\s.-]?\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function PartnersPageClient() {
  const [type, setType] = useState<PartnerType>('coach');
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', audience: '', message: '' });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const audience = AUDIENCE[type];

  const errors = useMemo(() => {
    const e: Partial<Record<keyof typeof form, string>> = {};
    if (form.name.trim().length < 3) e.name = 'Indiquez au moins 3 caractères.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Numéro tunisien à 8 chiffres attendu.';
    if (!form.city) e.city = 'Choisissez votre gouvernorat.';
    return e;
  }, [form]);

  const valid = Object.keys(errors).length === 0;
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const errorFor = (k: keyof typeof form) => (touched ? errors[k] : undefined);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setTouched(true);
      setServerError(null);
      if (!valid || submitting) return;

      setSubmitting(true);
      try {
        const payload: PartnerApplication = {
          type,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          city: form.city,
          audience_size: form.audience.trim() || undefined,
          message: form.message.trim() || undefined,
        };
        await applyAsPartner(payload);
        setDone(true);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        setServerError(
          err instanceof Error && err.message
            ? err.message
            : "L'envoi a échoué. Réessayez, ou contactez-nous directement.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [valid, submitting, type, form],
  );

  if (done) {
    return (
      <div className="min-h-screen bg-canvas">
        <main className="max-w-site mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="pt-plate font-poppins mx-auto max-w-xl rounded-2xl border border-hairline p-8 text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
              <CheckCircle2 className="h-7 w-7" aria-hidden />
            </span>
            <h1 className="font-display text-2xl font-extrabold uppercase leading-tight tracking-tight text-ink-1 sm:text-3xl">
              Candidature envoyée
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Merci. Nous étudions chaque demande à la main — comptez un à deux jours ouvrés. Vous
              recevrez un e-mail à <strong className="text-ink-1">{form.email.trim()}</strong> avec
              votre code et vos accès dès validation.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-brand"
            >
              Retour à la boutique
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <main>
        <Section as="div" spacing="tight" width="wide" first>
          <PageHeader
            kicker="Programme partenaire"
            title="Devenez partenaire Protein.tn"
            subtitle="Coachs et salles de sport : vos clients achètent déjà des compléments. Faites en sorte qu'ils achètent mieux, moins cher, et que cela vous rapporte."
            action={
              <Link
                href="#candidature"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors [@media(hover:hover)]:hover:bg-brand-hover"
              >
                Candidater
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />

          {/* Audience switch — changes the argument, not just the label. */}
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(Object.keys(AUDIENCE) as PartnerType[]).map((t) => {
              const a = AUDIENCE[t];
              const Icon = a.icon;
              const active = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  aria-pressed={active}
                  className={`flex min-h-[112px] flex-col rounded-2xl border p-5 text-left transition-colors ${
                    active
                      ? 'border-brand bg-brand/5 ring-1 ring-brand'
                      : 'border-hairline bg-canvas [@media(hover:hover)]:hover:border-brand/40'
                  }`}
                >
                  <span className="mb-2 flex items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? 'bg-brand text-white' : 'bg-sunken text-ink-3'
                      }`}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden />
                    </span>
                    <span
                      className={`font-display text-lg font-extrabold uppercase tracking-tight ${
                        active ? 'text-brand' : 'text-ink-1'
                      }`}
                    >
                      {a.label}
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-2">{a.pitch}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── How it works ───────────────────────────────────────────────────────────── */}
        <Section as="section" spacing="default" width="wide" surface="sunken" aria-labelledby="pt-steps">
          <SectionHeader
            kicker="En trois étapes"
            icon={<Dumbbell className="h-3.5 w-3.5" aria-hidden />}
            title="Comment ça marche"
            scale="2"
            id="pt-steps"
          />
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li key={s.title} className="rounded-2xl border border-hairline bg-canvas p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-hairline">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* ── Benefits ───────────────────────────────────────────────────────────────── */}
        <Section as="section" spacing="default" width="wide" aria-labelledby="pt-benefits">
          <SectionHeader kicker="Ce que vous gagnez" title="Pourquoi nous rejoindre" scale="2" id="pt-benefits" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="rounded-2xl border border-hairline bg-canvas p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{b.body}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Application ────────────────────────────────────────────────────────────── */}
        <Section as="section" spacing="feature" width="wide" surface="sunken" id="candidature" last aria-labelledby="pt-apply">
          <SectionHeader
            kicker="Candidature"
            title="Rejoignez le programme"
            subtitle="Gratuit, sans engagement, et étudié à la main. Nous répondons sous un à deux jours ouvrés."
            scale="2"
            id="pt-apply"
          />

          <form
            onSubmit={handleSubmit}
            noValidate
            /* `sm:p-6`, not `sm:p-7`. 28px is off the 8px lattice the whole spacing scale is built
               on (§3), and card padding is specified as 20/24. Caught by DS008. */
            className="pt-plate font-poppins mt-6 rounded-2xl border border-hairline p-5 sm:p-6"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                id="pf-name"
                label={audience.nameLabel}
                placeholder={audience.namePlaceholder}
                value={form.name}
                onChange={set('name')}
                error={errorFor('name')}
                autoComplete="name"
                required
              />
              <Field
                id="pf-email"
                label="E-mail"
                type="email"
                placeholder="vous@exemple.tn"
                value={form.email}
                onChange={set('email')}
                error={errorFor('email')}
                autoComplete="email"
                required
              />
              <Field
                id="pf-phone"
                label="Téléphone"
                type="tel"
                placeholder="20 123 456"
                value={form.phone}
                onChange={set('phone')}
                error={errorFor('phone')}
                autoComplete="tel"
                required
              />
              <div className="min-w-0">
                <label htmlFor="pf-city" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Gouvernorat <span className="text-brand">*</span>
                </label>
                <select
                  id="pf-city"
                  value={form.city}
                  onChange={(e) => set('city')(e.target.value)}
                  aria-invalid={errorFor('city') ? true : undefined}
                  className={`h-12 w-full rounded-xl border bg-canvas px-3 text-sm text-ink-1 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                    errorFor('city') ? 'border-destructive' : 'border-hairline'
                  }`}
                >
                  <option value="">Choisissez…</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errorFor('city') && <p className="mt-1.5 text-xs text-destructive">{errorFor('city')}</p>}
              </div>
              <Field
                id="pf-audience"
                label={type === 'coach' ? 'Nombre de clients suivis' : "Nombre d'adhérents"}
                placeholder="Ex. 40"
                value={form.audience}
                onChange={set('audience')}
                hint="Optionnel — nous aide à calibrer votre offre."
              />
            </div>

            <div className="mt-4">
              <label htmlFor="pf-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">
                Un mot sur vous
              </label>
              <textarea
                id="pf-message"
                rows={4}
                value={form.message}
                onChange={(e) => set('message')(e.target.value)}
                placeholder={
                  type === 'coach'
                    ? 'Votre spécialité, où vous coachez, vos réseaux…'
                    : 'Votre salle, sa taille, vos horaires, vos réseaux…'
                }
                className="w-full resize-y rounded-xl border border-hairline bg-canvas p-3 text-sm text-ink-1 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <p className="mt-1.5 text-xs text-ink-3">Optionnel.</p>
            </div>

            {serverError && (
              <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="mt-5 min-h-[48px] w-full sm:w-auto">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Envoi…
                </>
              ) : (
                <>
                  Envoyer ma candidature
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </>
              )}
            </Button>

            <p className="mt-4 text-xs leading-relaxed text-ink-3">
              En envoyant ce formulaire, vous nous autorisez à vous contacter au sujet du programme
              partenaire. Vos coordonnées ne sont ni revendues ni utilisées pour autre chose.
            </p>
          </form>
        </Section>
      </main>
      <ScrollToTop />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  placeholder,
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`h-12 w-full rounded-xl border bg-canvas px-3 text-sm text-ink-1 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 ${
          error ? 'border-destructive' : 'border-hairline'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
