import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, FileText, Mail, MapPin, Phone } from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { buildCanonicalUrl, getBaseUrl } from '@/util/canonical';
import { LEGAL_IDENTITY } from '@/util/company';
import { buildBreadcrumbListSchema } from '@/util/structuredData';

const TITLE = 'Mentions légales | Protein.tn — SOBITAS Tunisie';
const DESCRIPTION =
  'Mentions légales de Protein.tn : identité de SOBITAS, registre de commerce, matricule fiscal, adresse et coordonnées de contact à Sousse.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl('/mentions-legales') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl('/mentions-legales'),
    type: 'website',
    siteName: 'Protéine Tunisie',
    locale: 'fr_TN',
  },
};

const IDENTITY = [
  ['Éditeur', LEGAL_IDENTITY.legalName],
  ['Nom commercial', LEGAL_IDENTITY.brand],
  ['Registre de commerce', LEGAL_IDENTITY.registreCommerce],
  ['Matricule fiscal', LEGAL_IDENTITY.matriculeFiscal],
  ['Siège', 'Rue Ribat, Sousse 4000, Tunisie'],
] as const;

export default function MentionsLegalesPage() {
  const baseUrl = getBaseUrl();
  const canonical = buildCanonicalUrl('/mentions-legales');
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Mentions légales',
    description: DESCRIPTION,
    url: canonical,
    inLanguage: 'fr-TN',
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
  };
  const breadcrumbSchema = buildBreadcrumbListSchema(
    [{ name: 'Accueil', url: '/' }, { name: 'Mentions légales', url: '/mentions-legales' }],
    baseUrl
  );

  return (
    <div className="min-h-screen bg-canvas text-ink-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <main>
        <Section as="div" spacing="feature" width="wide" first>
          <div className="max-w-3xl">
            <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-brand">
              <span className="h-px w-7 bg-brand" aria-hidden="true" />
              Informations légales
            </span>
            <h1 className="font-display font-compressed text-[2.25rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 sm:text-5xl lg:text-6xl">
              Mentions légales
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
              Les informations officielles de la société tunisienne qui édite et exploite Protein.tn.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
            <section className="rounded-2xl border border-hairline bg-elevated p-5 sm:p-6" aria-labelledby="legal-identity">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sunken text-brand">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Société</p>
                  <h2 id="legal-identity" className="font-display text-lg font-bold uppercase tracking-wide text-ink-1">
                    Identité de l’éditeur
                  </h2>
                </div>
              </div>
              <dl className="mt-5 divide-y divide-rule">
                {IDENTITY.map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
                    <dt className="text-sm text-ink-3">{label}</dt>
                    <dd className="break-words text-sm font-semibold text-ink-1 sm:text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-2xl border border-hairline bg-sunken p-5 sm:p-6" aria-labelledby="legal-contact">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-elevated text-brand">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id="legal-contact" className="font-display text-lg font-bold uppercase tracking-wide text-ink-1">
                  Nous contacter
                </h2>
              </div>
              <address className="mt-5 space-y-3 not-italic">
                <a className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-ink-2 hover:text-brand" href="mailto:contact@protein.tn">
                  <Mail className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  contact@protein.tn
                </a>
                <a className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-ink-2 hover:text-brand" href="tel:+21627612500">
                  <Phone className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  +216 27 612 500
                </a>
                <p className="flex min-h-[44px] items-center gap-3 text-sm font-medium text-ink-2">
                  <MapPin className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                  Rue Ribat, Sousse 4000
                </p>
              </address>
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-fill px-5 text-sm font-semibold text-on-brand-fill transition-colors hover:bg-brand-fill-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                Page contact
              </Link>
            </section>
          </div>
        </Section>

        <Section surface="sunken" spacing="default" width="wide" last>
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-hairline bg-elevated p-5">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink-1">Contenus du site</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Les textes, visuels, marques et éléments graphiques publiés sur Protein.tn sont protégés. Toute reproduction non autorisée est interdite.
              </p>
            </section>
            <section className="rounded-2xl border border-hairline bg-elevated p-5">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink-1">Données et cookies</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Les règles applicables aux données personnelles et aux traceurs sont détaillées dans notre{' '}
                <Link className="font-semibold text-brand hover:underline" href="/politique-des-cookies">politique des cookies</Link>.
              </p>
            </section>
            <section className="rounded-2xl border border-hairline bg-elevated p-5">
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-ink-1">Vente en ligne</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                Les commandes, paiements, livraisons et retours sont encadrés par nos{' '}
                <Link className="font-semibold text-brand hover:underline" href="/conditions-generale-de-ventes-protein">conditions générales de vente</Link>.
              </p>
            </section>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-ink-3">Dernière mise à jour : 26 août 2026.</p>
        </Section>
      </main>
    </div>
  );
}
