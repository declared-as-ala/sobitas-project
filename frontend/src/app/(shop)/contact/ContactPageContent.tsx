import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  CreditCard,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  PackageSearch,
  Phone,
  RotateCcw,
  Store,
} from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { MapPanel } from '@/app/components/MapPanel';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { buildWhatsAppHref, WHATSAPP_ARIA_LABEL, WHATSAPP_ICON_PATH } from '@/util/whatsapp';
import { LEGAL_IDENTITY } from '@/util/company';
import { ContactForm } from './ContactForm';
import type { Coordinate } from '@/types';

/**
 * ── CONTACT, REBUILT ────────────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"same for the contact page"* — redesigned, on real data, full width.
 *
 * MEASURED first (scripts/measure-pages.mjs): the page was 2,052px at 1536, of which the FOOTER
 * was 906px. Forty-four per cent of a contact page was the site's footer; on a phone it was
 * fifty. The footer is fixed separately (see FooterClient), but the other half of that ratio is
 * this page having almost nothing on it: a heading, one column of four facts, and a form.
 *
 * ── THE ORDER IS THE ARGUMENT ───────────────────────────────────────────────────────────────
 * A form is the SLOWEST way to reach a shop and it was the biggest thing on the page. For a
 * Tunisian cash-on-delivery shop the fast channels are a phone call and WhatsApp, and the reader
 * who has come here usually wants one of those — so the four channels come first, as four equal
 * cards, each one a single tap. The form follows for everything that genuinely is written.
 *
 * The last band answers the four questions people actually open a contact page to ask (where is
 * my order, can I return it, how do I pay, do you deliver to me) by linking to the pages that
 * already answer them. Deflecting a support message is worth more than receiving it, and every
 * one of those is also an internal link from a page that has almost none.
 *
 * ── SERVER COMPONENT ────────────────────────────────────────────────────────────────────────
 * The whole page used to be `'use client'` so that three fields could hold state. The form is now
 * its own island (ContactForm) and everything else renders on the server.
 *
 * ── ONE THING NOT CHANGED, DELIBERATELY ─────────────────────────────────────────────────────
 * The opening hours below are the ones the LocalBusiness schema publishes
 * (`openingHoursSpecification` in util/structuredData) and the two must match — that is a stated
 * rule in that file. The shop's Google Business Profile currently shows a DIFFERENT Wednesday
 * opening (11:00 rather than 10:00), read from the profile on 19/08/2026. Only one day was
 * visible there, so this is reported to the owner rather than guessed at: changing published
 * hours from a partial reading would put the site, the schema and the profile into three
 * different states instead of two.
 */

/** The four ways to reach the shop, fastest first. */
const CHANNELS = [
  {
    icon: Phone,
    label: 'Par téléphone',
    value: '+216 27 612 500',
    href: 'tel:+21627612500',
    hint: 'Lun. – sam., 10 h – 19 h 30',
    external: false,
  },
  {
    icon: MessageCircle,
    label: 'Sur WhatsApp',
    value: 'Écrire maintenant',
    href: buildWhatsAppHref(),
    hint: 'Réponse en général sous l’heure',
    external: true,
    whatsapp: true,
  },
  {
    icon: Mail,
    label: 'Par email',
    value: 'contact@protein.tn',
    href: 'mailto:contact@protein.tn',
    hint: 'Réponse sous 24 h ouvrées',
    external: false,
  },
  {
    icon: Store,
    label: 'En boutique',
    value: 'Rue Ribat, Sousse',
    href: '#contact-boutique',
    hint: 'Ouvert six jours sur sept',
    external: false,
  },
] as const;

/** The four reasons people open a contact page, and the page that already answers each. */
const SELF_SERVE = [
  {
    icon: PackageSearch,
    title: 'Où en est ma commande ?',
    body: 'Suivez son statut et son numéro de suivi depuis votre espace client.',
    href: '/account/orders',
    cta: 'Voir mes commandes',
  },
  {
    icon: RotateCcw,
    title: 'Je veux retourner un produit',
    body: 'Les conditions, les délais et la marche à suivre, en détail.',
    href: '/politique-de-remboursement',
    cta: 'Politique de remboursement',
  },
  {
    icon: CreditCard,
    title: 'Comment puis-je payer ?',
    body: 'Paiement à la livraison, carte bancaire, frais et seuils de gratuité.',
    href: '/conditions-generale-de-ventes-protein',
    cta: 'Conditions de vente',
  },
  {
    icon: HelpCircle,
    title: 'Une question sur un produit',
    body: 'Dosage, composition, association : les réponses les plus fréquentes.',
    href: '/faqs',
    cta: 'Questions fréquentes',
  },
] as const;

export default function ContactPageContent({ coordinates }: { coordinates: Coordinate | null }) {
  const address = coordinates?.adresse_fr?.trim() || coordinates?.adresse?.trim() || 'Rue Ribat, Sousse 4000';
  const email = coordinates?.email || 'contact@protein.tn';
  const phones = ([coordinates?.phone_1, coordinates?.phone_2].filter(Boolean) as string[]).length
    ? ([coordinates?.phone_1, coordinates?.phone_2].filter(Boolean) as string[])
    : ['+216 27 612 500', '+216 73 200 169'];

  return (
    <div className="min-h-screen bg-canvas">
      <main>
        {/* ── HERO + THE FOUR CHANNELS ──────────────────────────────────────────────────── */}
        <Section as="div" spacing="feature" width="wide" first>
          <div className="max-w-2xl">
            <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-brand">
              <span className="h-px w-7 bg-brand" aria-hidden="true" />
              Contact
            </span>
            <h1 className="font-display font-compressed text-[2.25rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 sm:text-5xl lg:text-6xl">
              Parlons de votre objectif
            </h1>
            <p className="mt-4 text-base leading-relaxed text-ink-2 sm:text-lg">
              Une question sur un produit, une commande en cours, un conseil avant d’acheter — l’équipe de{' '}
              {LEGAL_IDENTITY.shortLegalName} répond du lundi au samedi, depuis la boutique de Sousse.
            </p>
          </div>

          {/* Four equal cards, each one tap. A phone call is the fastest way to reach this shop
              and it used to be a line of text in the third card down a sidebar. */}
          <ul className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:mt-9 lg:grid-cols-4">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              const isWhatsApp = 'whatsapp' in c && c.whatsapp;
              return (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    {...(isWhatsApp ? { 'aria-label': WHATSAPP_ARIA_LABEL } : {})}
                    className="group flex h-full items-start gap-3.5 rounded-2xl border border-hairline bg-elevated p-4 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:block sm:p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-brand transition-colors group-hover:bg-brand group-hover:text-on-brand sm:h-11 sm:w-11">
                      {isWhatsApp ? (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d={WHATSAPP_ICON_PATH} />
                        </svg>
                      ) : (
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                      )}
                    </span>
                    <span className="block min-w-0 sm:mt-4">
                      <span className="block text-xs uppercase tracking-wide text-ink-3">{c.label}</span>
                      <span className="mt-0.5 block break-words font-display text-[15px] font-bold tracking-wide text-ink-1 transition-colors group-hover:text-brand">
                        {c.value}
                      </span>
                      <span className="mt-1 block text-xs leading-snug text-ink-3">{c.hint}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ── THE FORM, AND WHERE THE SHOP IS ───────────────────────────────────────────── */}
        {/* `scroll-mt-28` because the header is sticky: without it the "En boutique" card above
            jumps this band under the header rather than to the top of it. */}
        <Section
          surface="sunken"
          spacing="default"
          width="wide"
          id="contact-boutique"
          className="scroll-mt-28"
          aria-labelledby="contact-write"
        >
          <SectionHeader
            id="contact-write"
            scale="2"
            kicker="Écrivez-nous"
            title="Envoyer un message"
            subtitle="Pour tout ce qui demande une trace écrite : devis, réclamation, demande professionnelle."
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
            <div className="min-w-0">
              <ContactForm />
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
                <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">
                  La boutique
                </h3>
                <dl className="mt-3.5 divide-y divide-rule">
                  <InfoRow icon={MapPin} label="Adresse">
                    <span className="break-words">{address}</span>
                  </InfoRow>
                  <InfoRow icon={Clock} label="Horaires">
                    <span className="block"><span className="inline-flex items-center gap-1.5">
                      Lundi
                      <ArrowRight className="h-3.5 w-3.5 text-brand" strokeWidth={2} aria-hidden="true" />
                      Samedi
                    </span>
                    {' : 10 h – 19 h 30'}</span>
                    <span className="block">Dimanche : 14 h – 19 h</span>
                  </InfoRow>
                  <InfoRow icon={Phone} label="Téléphone">
                    {phones.map((p) => (
                      <a
                        key={p}
                        href={`tel:${p.replace(/\s/g, '')}`}
                        className="block transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {p}
                      </a>
                    ))}
                  </InfoRow>
                  <InfoRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${email}`}
                      className="break-all transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {email}
                    </a>
                  </InfoRow>
                </dl>
              </div>

              <MapPanel
                embedHtml={coordinates?.gelocalisation}
                address={address}
                className="min-w-0"
                mapClassName="h-44 sm:h-52"
              />
            </div>
          </div>
        </Section>

        {/* ── DEFLECTION ────────────────────────────────────────────────────────────────── */}
        <Section spacing="default" width="wide" last aria-labelledby="contact-self-serve">
          <SectionHeader
            id="contact-self-serve"
            scale="2"
            kicker="Réponse immédiate"
            title="Avant de nous écrire"
            subtitle="Quatre questions reviennent plus que toutes les autres — et la réponse est déjà en ligne."
          />
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {SELF_SERVE.map(({ icon: Icon, title, body, href, cta }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-2xl border border-hairline bg-elevated p-5 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunken text-brand">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <span className="mt-4 block font-display text-[15px] font-bold uppercase tracking-wide text-ink-1">
                    {title}
                  </span>
                  <span className="mt-1.5 block text-[13.5px] leading-relaxed text-ink-2">{body}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand">
                    {cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-3">
            Vous êtes coach, salle de sport ou revendeur ?
            <Link
              href="/partenaires"
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Voir le programme partenaire
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
        </Section>
      </main>
      <ScrollToTop />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-brand">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
        <dd className="mt-0.5 text-sm leading-relaxed text-ink-1">{children}</dd>
      </div>
    </div>
  );
}
