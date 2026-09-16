import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  LineChart,
  Link2,
  LogIn,
  Percent,
  PackageCheck,
  Tag,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { PageHeader } from '@/app/components/PageHeader';
import { SectionHeader } from '@/app/components/SectionHeader';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getBaseUrl } from '@/util/canonical';
import { buildBreadcrumbListSchema, buildFAQPageSchemaFromQA, validateStructuredData } from '@/util/structuredData';
import { AFFILIATE_FAQ, AFFILIATE_PROFILES } from './affiliateCopy';
import { AffiliateMarginVisual } from './AffiliateMarginVisual';

/**
 * /partenaires — the affiliate programme's front door.
 *
 * ── WHAT CHANGED, AND WHY ─────────────────────────────────────────────────────────────────
 * This page used to be a lead-capture form: read the offer, scroll to the bottom, fill six
 * fields, POST. Two things were wrong with that. The POST went to `/partner-applications`, a
 * route that never existed, so every application submitted here was lost. And an affiliate who
 * ALREADY has an account had nowhere to go — "Accès Pro" in the header is the only affiliate
 * affordance on the site, and it landed them on a signup form.
 *
 * So the page now leads with TWO DOORS and nothing else above the fold:
 *
 *     Devenir affilié   ->  /partenaires/inscription   (the five-step signup)
 *     Se connecter      ->  the Filament panel on the admin host
 *
 * The persuasive content underneath is kept almost verbatim — it is well written and it is what
 * this URL ranks on ("devenir partenaire salle de sport tunisie") — but it now sits BELOW the
 * decision instead of gating it. The old audience switch is gone as a control and survives as
 * content: four profile cards, one per affiliate type, each a link into the signup with that
 * type already chosen. One decision made before the form even opens.
 *
 * ── SERVER COMPONENT ──────────────────────────────────────────────────────────────────────
 * There is no state left on this page. The switch was the only reason it was ever `'use client'`,
 * and removing it takes the whole landing off the client bundle: what remains is links, and
 * `LinkWithLoading` draws its own boundary.
 *
 * ── THE ROUTE NAME IS NOT MINE TO CHANGE ──────────────────────────────────────────────────
 * `/partenaires` is submitted in the sitemap (util/sitemapSources.ts), reserved in
 * `isReservedRouteSlug` so Googlebot does not get a 404, and has accumulated signals since
 * August. The owner's rename map (docs/affiliate-ecosystem-plan.md §6) applies to the DATABASE
 * and the admin, not to a public URL. The word "affilié" leads everywhere on the page; the path
 * stays.
 */

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * The two doors
 *
 * Rendered twice — once above the fold, once as the closing band — and BOTH times on a `canvas`
 * band. That is a real constraint, not a coincidence: the secondary door is a `bg-sunken` plate,
 * which is legible on white and invisible on sand. If a third caller ever puts this on a sunken
 * band, give it a surface prop rather than letting the card disappear.
 * ──────────────────────────────────────────────────────────────────────────────────────────*/
function AffiliateDoors() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {/*
        The primary door is FILLED and the secondary is not, so the row has exactly one object
        that looks pressable first. Both are the whole card, not a button inside a card: a gym
        owner reading this on a phone should not have to find a small target inside a big one.

        Sub-copy is at FULL `text-on-brand`, never at an alpha. White on #D53B04 measures 4.71:1
        with nothing to spare — 85% opacity composites to ~3.9:1 and fails AA on the exact line
        that explains what the button does.
      */}
      <LinkWithLoading
        href="/partenaires/inscription"
        loadingMessage="Ouverture de l’inscription…"
        className="group flex min-h-[124px] flex-col justify-between gap-4 rounded-2xl bg-brand p-5 text-on-brand transition-colors [@media(hover:hover)]:hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-on-brand/15">
            <UserPlus className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-extrabold uppercase tracking-tight">
            Devenir affilié
          </span>
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="text-sm leading-snug">
            Inscription en 5 étapes, environ 5 minutes. Gratuit et sans engagement.
          </span>
          <ArrowRight
            className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </LinkWithLoading>

      {/*
        The affiliate space is now an internal Next.js route (protein.tn/affiliate/login), not the
        Filament panel on the admin host — so this is a `LinkWithLoading`, which draws its own
        navigation boundary. Same brand domain, its own session, separate from admin.
      */}
      <LinkWithLoading
        href="/affiliate/login"
        loadingMessage="Ouverture de votre espace…"
        className="group flex min-h-[124px] flex-col justify-between gap-4 rounded-2xl border border-rule-strong bg-sunken p-5 text-ink-1 transition-colors [@media(hover:hover)]:hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-brand">
            <LogIn className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-extrabold uppercase tracking-tight">
            Se connecter
          </span>
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="text-sm leading-snug text-ink-2">
            Déjà affilié ? Vos ventes, vos commissions et vos paiements.
          </span>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-brand transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </LinkWithLoading>
    </div>
  );
}

const REASSURANCE = ['Gratuit, sans engagement', 'Dossier étudié à la main', 'Réponse sous 48 heures'];

const STEPS = [
  {
    icon: BadgeCheck,
    title: 'Vous vous inscrivez',
    body: "Cinq écrans, environ cinq minutes : votre profil, vos coordonnées, votre pièce d'identité, puis deux codes de confirmation.",
  },
  {
    icon: Tag,
    title: 'Vous recevez votre code',
    body: 'Après vérification, un code de réduction à votre nom que vos clients utilisent au paiement. Ils économisent immédiatement.',
  },
  {
    icon: Wallet,
    title: 'Vous êtes payé',
    body: 'Une commission sur chaque commande, acquise dès que le colis est livré. Versement chaque vendredi sur votre compte.',
  },
];

const BENEFITS = [
  {
    icon: Percent,
    title: 'Vos clients économisent',
    body: 'Une remise réelle à leur nom, pas un code générique trouvable partout.',
  },
  {
    icon: LineChart,
    title: 'Suivi transparent',
    body: 'Chaque vente, chaque commission et chaque versement, visibles dans votre espace.',
  },
  {
    icon: PackageCheck,
    title: 'Aucun stock, aucune avance',
    body: 'Nous gérons la commande, le paiement, la livraison et le service client.',
  },
  {
    icon: Link2,
    title: 'Code ou lien',
    body: 'Un code à dicter en salle, ou un lien à poster : les deux vous sont attribués.',
  },
];

export function AffiliateLanding() {
  const breadcrumbSchema = buildBreadcrumbListSchema([
    { name: 'Accueil', url: '/' },
    { name: 'Programme Affilié', url: '/partenaires' },
  ], getBaseUrl());
  validateStructuredData(breadcrumbSchema, 'BreadcrumbList');
  const faqSchema = buildFAQPageSchemaFromQA(AFFILIATE_FAQ);
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <div className="min-h-screen bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <main>
        {/* ── The decision ─────────────────────────────────────────────────────────────── */}
        <Section as="div" spacing="tight" width="wide" first>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 lg:items-start">
            <div className="min-w-0">
              <PageHeader
                kicker="Espace affilié"
                title="Devenez affilié Protein.tn"
                subtitle="Coach, salle de sport, créateur ou simple passionné : partagez votre code, vos proches économisent, et chaque commande livrée vous rapporte."
              />

              <div className="mt-6">
                <AffiliateDoors />
              </div>

              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
                {REASSURANCE.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-ok" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 min-w-0 lg:mt-0">
              <AffiliateMarginVisual />
            </div>
          </div>
        </Section>

        {/* ── How it works ─────────────────────────────────────────────────────────────── */}
        <Section as="section" spacing="default" width="wide" surface="sunken" aria-labelledby="aff-steps">
          <SectionHeader kicker="En trois étapes" title="Comment ça marche" scale="2" id="aff-steps" />
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="rounded-2xl border border-hairline bg-canvas p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    {/*
                      `text-rule-strong`, not `text-rule`. The ghost numeral is decorative in
                      intent but it is real 30px text, so WCAG's 3:1 large-text floor applies:
                      the previous value measured 1.51:1 on canvas and 2.02:1 in dark, and both
                      were flagged by the contrast pass. `rule-strong` is 3.34:1 on white and
                      4.10:1 on the dark plate — still quiet, now legible.
                    */}
                    <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-rule-strong">
                      {index + 1}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{step.body}</p>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* ── What you get ─────────────────────────────────────────────────────────────── */}
        <Section as="section" spacing="default" width="wide" aria-labelledby="aff-benefits">
          <SectionHeader kicker="Ce que vous gagnez" title="Pourquoi nous rejoindre" scale="2" id="aff-benefits" />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="rounded-2xl border border-hairline bg-canvas p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-ink-1">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{benefit.body}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Who it is for ────────────────────────────────────────────────────────────────
            The old audience SWITCH, demoted to content. It was a control that changed one
            paragraph and one field label — which meant a visitor had to operate the page to
            find out whether the programme was for them, and a marketeur operating it found
            only "coach" and "salle". Four cards say it without being touched, and each one is
            a link that pre-selects its own type in the signup. */}
        <Section as="section" spacing="default" width="wide" surface="sunken" aria-labelledby="aff-profiles">
          <SectionHeader
            kicker="Pour qui"
            title="Quatre façons d’être affilié"
            subtitle="Choisissez le profil qui vous ressemble : l’inscription s’ouvre déjà réglée dessus."
            scale="2"
            id="aff-profiles"
          />
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {AFFILIATE_PROFILES.map((profile) => {
              const Icon = profile.icon;
              return (
                <LinkWithLoading
                  key={profile.kind}
                  href={`/partenaires/inscription?type=${profile.kind}`}
                  loadingMessage="Ouverture de l’inscription…"
                  className="group flex flex-col rounded-2xl border border-hairline bg-canvas p-5 transition-colors [@media(hover:hover)]:hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <span className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-lg font-extrabold uppercase leading-none tracking-tight text-ink-1">
                        {profile.label}
                      </span>
                      <span className="mt-1 block text-xs text-ink-3">{profile.tagline}</span>
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-2">{profile.pitch}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    Commencer comme {profile.label.toLowerCase()}
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </LinkWithLoading>
              );
            })}
          </div>
        </Section>

        {/* ── The same decision, at the end ────────────────────────────────────────────── */}
        <Section as="section" spacing="feature" width="wide" last aria-labelledby="aff-cta">
          {/* Keep the FAQ inside this canvas band so both door plates retain their contrast. */}
          <div className="mb-10 sm:mb-12" role="group" aria-labelledby="aff-faq">
            <SectionHeader
              kicker="Questions fréquentes"
              title="Vous vous demandez peut-être…"
              scale="2"
              id="aff-faq"
            />
            <div className="space-y-3">
              {AFFILIATE_FAQ.map(({ question, answer }) => (
                <details key={question} className="group rounded-xl border border-hairline bg-elevated">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3 font-semibold text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-relaxed text-ink-2">{answer}</p>
                </details>
              ))}
            </div>
          </div>
          <SectionHeader
            kicker="Prêt ?"
            title="Ouvrez votre espace affilié"
            subtitle="Vous n’avancez rien, vous ne stockez rien. Nous vérifions votre dossier à la main et nous vous appelons."
            scale="2"
            id="aff-cta"
          />
          <div className="mt-6">
            <AffiliateDoors />
          </div>
          <p className="mt-4 text-sm text-ink-2">
            Une question avant de vous lancer ?{' '}
            <LinkWithLoading
              href="/contact"
              className="-my-3 inline-flex min-h-[44px] items-center font-semibold text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Écrivez-nous
            </LinkWithLoading>
          </p>
        </Section>
      </main>
      <ScrollToTop />
    </div>
  );
}
