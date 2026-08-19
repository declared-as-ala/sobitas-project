import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Clock,
  Headset,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { MapPanel } from '@/app/components/MapPanel';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { splitCmsBody } from '@/util/cmsSections';
import { GOOGLE_PROFILE, LEGAL_IDENTITY } from '@/util/company';
import { buildWhatsAppHref, WHATSAPP_ARIA_LABEL, WHATSAPP_ICON_PATH } from '@/util/whatsapp';
import type { Coordinate, Page } from '@/types';

/**
 * ── QUI SOMMES-NOUS, REBUILT ────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026: *"redesign the qui sommes nous page entirely, use our Google Business
 * Profile, our data, and make it super real and super pro as design like we did for the landing
 * page … use the full width of the page."*
 *
 * MEASURED first (scripts/measure-pages.mjs): at a 1536px viewport the page ran 5,690px on an
 * **896px rail** — `max-w-4xl`, 58% of the window, on the one page whose job is to look like a
 * real company. Everything else on the site runs on `max-w-site` (1600). That is where "use the
 * full width" comes from, and it is also why the page read as a document rather than as a part of
 * this site: it was the only surface not sharing the site's rail.
 *
 * ── "SUPER REAL" IS NOT A VISUAL TREATMENT ──────────────────────────────────────────────────
 * The thing that makes an About page credible is not photography or a bigger headline. It is
 * checkable facts. So the hero carries the REGISTERED IDENTITY — legal name, registre de commerce,
 * matricule fiscal, seat, year — read from the shop's own /coordonnees record (see util/company).
 * For a Tunisian cash-on-delivery shop, where the buyer hands cash to a stranger at their door,
 * a real RC and MF is the single most persuasive thing this page can say, and it said none of it.
 *
 * The Google rating is shown BECAUSE it is somebody else's number: attributed, linked to the
 * profile it came from, and deliberately NOT emitted as `aggregateRating` in the page's schema —
 * that markup is the structured-data violation whose penalty is a sitewide manual action. See
 * util/company for the full note, including why no review COUNT is published.
 *
 * ── WHAT THIS PAGE IS NOT ───────────────────────────────────────────────────────────────────
 * There is no storefront photograph, and one is deliberately not invented. The only image the CMS
 * body carries is a 404 (see util/cmsSections), and `coordonnees.cover` is the logo, not a photo.
 * A stock gym image would be the opposite of the brief: it is exactly what "looks AI-generated"
 * means on a page whose whole argument is that this is a real shop on a real street. The page is
 * typographic until real photography exists, and the hero has an obvious slot for it when it does.
 *
 * ── AND IT IS A SERVER COMPONENT ────────────────────────────────────────────────────────────
 * The old one was `'use client'` with a `DOMParser`, a `mounted` gate and a client re-fetch of
 * data the server had already loaded. Everything here renders on the server; the only client
 * islands left are the map (one button) and ScrollToTop.
 */

/** The four claims this shop can actually back. Each is stated elsewhere on the site or in schema. */
const COMMITMENTS = [
  {
    icon: ShieldCheck,
    title: 'Produits autorisés',
    body: 'Nos compléments sont importés et distribués conformément aux autorisations du Ministère de la Santé. Pas de contrefaçon, pas de circuit parallèle.',
  },
  {
    icon: Banknote,
    title: 'Paiement à la livraison',
    body: 'Vous payez au livreur, à la réception. Vous n’avancez rien et vous ne saisissez aucune carte pour commander.',
  },
  {
    icon: Truck,
    title: 'Expédition sous 24–72 h',
    body: 'Vers les 24 gouvernorats, et gratuitement à partir de 300 DT. Un numéro de suivi vous est transmis dès l’expédition.',
  },
  {
    icon: Headset,
    title: 'Un conseil, pas une vente',
    body: 'L’équipe est formée sur les gammes qu’elle vend. Appelez avant de commander : on vous dira aussi quand un produit n’est pas pour vous.',
  },
] as const;

/** Four figures, each verifiable. No invented catalogue or customer counts. */
const FIGURES = [
  { value: String(LEGAL_IDENTITY.foundedYear), label: 'Année de création', sub: 'Sousse, Tunisie' },
  { value: '24', label: 'Gouvernorats livrés', sub: 'Toute la Tunisie' },
  { value: '24–72 h', label: 'Délai d’expédition', sub: 'Gratuite dès 300 DT' },
  {
    value: GOOGLE_PROFILE.ratingValue.toLocaleString('fr-FR', { minimumFractionDigits: 1 }),
    label: 'Note Google',
    sub: 'sur 5',
    href: GOOGLE_PROFILE.url,
  },
] as const;

const IDENTITY_ROWS: Array<[string, string]> = [
  ['Raison sociale', 'STE BITOUTA D’ARTICLE DE SPORT'],
  ['Nom commercial', 'SOBITAS · Protein.tn'],
  ['Registre de commerce', LEGAL_IDENTITY.registreCommerce],
  ['Matricule fiscal', LEGAL_IDENTITY.matriculeFiscal],
  ['Siège', 'Rue Ribat, Sousse 4000'],
];

/**
 * The prose scale for the CMS body.
 *
 * Written once because it is applied to N section fragments, and every one of them must read the
 * same — the previous page had three different `prose-*` strings on three different blocks, which
 * is how the "engagement" list ended up a different size from the "expertise" list beside it.
 *
 * `prose-p:text-[0.95rem]` is not decoration: globals.css sets `p { font-size: var(--text-base) }`
 * in @layer base, so a paragraph never inherits a container's size — it has to be told.
 */
const PROSE =
  'prose prose-sm max-w-none dark:prose-invert sm:prose-base ' +
  'prose-p:text-ink-2 prose-p:leading-7 prose-p:mb-3 ' +
  'prose-strong:text-ink-1 prose-strong:font-semibold ' +
  'prose-a:text-brand prose-a:font-medium hover:prose-a:underline ' +
  'prose-ul:text-ink-2 prose-li:mb-1 prose-li:marker:text-brand ' +
  '[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto';

export default function AboutPageContent({
  page,
  coordinates,
}: {
  page: Page | null;
  coordinates: Coordinate | null;
}) {
  const { intro, sections } = splitCmsBody(page?.body);
  const address = coordinates?.adresse_fr?.trim() || coordinates?.adresse?.trim() || 'Rue Ribat, Sousse 4000';
  const email = coordinates?.email || 'contact@protein.tn';
  const phones = [coordinates?.phone_1, coordinates?.phone_2].filter(Boolean) as string[];
  const phoneList = phones.length > 0 ? phones : ['+216 27 612 500', '+216 73 200 169'];

  return (
    <div className="min-h-screen bg-canvas">
      <main>
        {/* ── HERO: THE ARGUMENT ON THE LEFT, THE PROOF ON THE RIGHT ────────────────────── */}
        <Section as="div" spacing="feature" width="wide" first>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-14">
            <div className="min-w-0">
              <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-brand">
                <span className="h-px w-7 bg-brand" aria-hidden="true" />
                Notre histoire
              </span>
              <h1 className="font-display font-compressed text-[2.25rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 sm:text-5xl lg:text-6xl">
                {page?.title?.trim() || 'Qui sommes-nous ?'}
              </h1>
              {/* The sentence the whole page exists to make machine-readable: the shop people
                  search for as SOBITAS is the shop now trading as Protein.tn. */}
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
                Protein.tn est la boutique en ligne de <strong className="font-semibold text-ink-1">SOBITAS</strong> —{' '}
                <span className="whitespace-nowrap">STE BITOUTA D’ARTICLE DE SPORT</span> — distributeur de compléments
                alimentaires sportifs et de matériel de musculation, installé à Sousse depuis{' '}
                {LEGAL_IDENTITY.foundedYear} et livrant les 24 gouvernorats de Tunisie.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/shop"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-brand px-6 font-display text-sm font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  <Package className="h-4 w-4" aria-hidden="true" /> Nos produits
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-rule px-6 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  <Phone className="h-4 w-4" aria-hidden="true" /> Nous contacter
                </Link>
              </div>
            </div>

            {/* THE IDENTITY PLATE. A definition list, not a card of adjectives — every row here
                is a number somebody can look up. */}
            <div className="min-w-0 rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-hairline pb-3.5">
                <BadgeCheck className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">
                  Société enregistrée
                </h2>
              </div>
              <dl className="mt-3.5 space-y-3">
                {IDENTITY_ROWS.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <dt className="shrink-0 text-xs uppercase tracking-wide text-ink-3">{label}</dt>
                    <dd className="min-w-0 break-words text-sm font-semibold text-ink-1 sm:text-right">{value}</dd>
                  </div>
                ))}
              </dl>
              <a
                href={GOOGLE_PROFILE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-hairline bg-sunken px-4 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Star className="h-4 w-4 shrink-0 fill-brand text-brand" aria-hidden="true" />
                  <span className="min-w-0 text-sm text-ink-2">
                    <strong className="font-semibold tabular-nums text-ink-1">
                      {GOOGLE_PROFILE.ratingValue.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} / 5
                    </strong>{' '}
                    sur Google
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* THE FIGURES, as the foot of the hero rather than a band of their own — the same move
              FeaturesSection makes under the homepage slider, and for the same reason: they
              qualify the claim above them, so a colour change between the two would be wrong. */}
          <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline lg:mt-10 lg:grid-cols-4">
            {FIGURES.map((f) => {
              const inner = (
                <>
                  <span className="font-display font-compressed text-[1.75rem] font-extrabold leading-none tracking-tight text-ink-1 sm:text-[2rem]">
                    {f.value}
                  </span>
                  <span className="mt-2 block text-[13px] font-semibold leading-tight text-ink-1">{f.label}</span>
                  <span className="mt-0.5 block text-xs leading-tight text-ink-3">{f.sub}</span>
                </>
              );
              return (
                <li key={f.label} className="bg-canvas">
                  {'href' in f && f.href ? (
                    <a
                      href={f.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block h-full p-4 transition-colors hover:bg-sunken sm:p-5"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div className="h-full p-4 sm:p-5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        {/* ── THE CMS BODY ──────────────────────────────────────────────────────────────── */}
        {(intro || sections.length > 0) && (
          <Section surface="sunken" spacing="default" width="wide" aria-labelledby="about-story">
            <SectionHeader
              id="about-story"
              scale="2"
              kicker="En détail"
              title="Notre maison, en quelques mots"
            />

            {/*
              ── THREE COLUMNS, BECAUSE "FULL WIDTH" AND "READABLE" ARE NOT THE SAME ASK ────
              Run across the whole 1600px rail, this body measured ~150 characters a line. Full
              width is what the owner asked for and 150 characters is unreadable, so the width
              buys three jobs instead of one long line:

                SOMMAIRE     the seven headings, as navigation, pinned while the prose scrolls
                PROSE        capped at 46rem — about 75 characters, the readable band
                ASIDE        the thing a reader wants at the exact moment they are reading about
                             the shop: how to reach a human. Pinned too, so it is never scrolled
                             past.

              The aside appears only at `xl`, where there is genuinely a third column's worth of
              room; below that the layout is ToC + prose, and on a phone it is one column.
            */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[minmax(0,14rem)_minmax(0,46rem)_minmax(0,1fr)]">
              {sections.length > 1 && (
                <nav aria-label="Sommaire" className="min-w-0 lg:sticky lg:top-28 lg:self-start">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
                    Sommaire
                  </h3>
                  <ul className="mt-3 space-y-0.5 border-l border-rule">
                    {sections.map((s) => (
                      <li key={s.id}>
                        <a
                          href={`#${s.id}`}
                          className="-ml-px flex min-h-[40px] items-center border-l-2 border-transparent py-1.5 pl-3.5 text-[13px] leading-snug text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className="min-w-0 xl:max-w-[46rem]">
                {intro && (
                  <div
                    className={`${PROSE} border-b border-rule pb-6 prose-p:text-[0.9375rem] sm:prose-p:text-base`}
                    dangerouslySetInnerHTML={{ __html: intro }}
                  />
                )}
                <div className="divide-y divide-rule">
                  {sections.map((s) => (
                    <article key={s.id} id={s.id} className="scroll-mt-28 py-6 first:pt-6">
                      <h3 className="font-display font-compressed text-xl font-extrabold uppercase leading-tight tracking-[-0.01em] text-ink-1 sm:text-2xl">
                        {s.title}
                      </h3>
                      <div
                        className={`${PROSE} mt-3 prose-p:text-[0.9375rem] sm:prose-p:text-base`}
                        dangerouslySetInnerHTML={{ __html: s.html }}
                      />
                    </article>
                  ))}
                </div>
              </div>

              {/* The aside. A phone number is the answer to most of what somebody reads an About
                  page wondering, so it sits beside the reading rather than at the end of it. */}
              <aside className="hidden min-w-0 xl:block xl:sticky xl:top-28 xl:self-start">
                <div className="rounded-2xl border border-hairline bg-elevated p-5">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wide text-ink-1">
                    Une question ?
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    L’équipe répond du lundi au samedi, 10 h – 19 h 30.
                  </p>
                  <div className="mt-4 space-y-2">
                    {phoneList.slice(0, 1).map((p) => (
                      <a
                        key={p}
                        href={`tel:${p.replace(/\s/g, '')}`}
                        className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {p}
                      </a>
                    ))}
                    <a
                      href={buildWhatsAppHref()}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={WHATSAPP_ARIA_LABEL}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rule px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={WHATSAPP_ICON_PATH} />
                      </svg>
                      WhatsApp
                    </a>
                    <Link
                      href="/contact"
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rule px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Écrire un message
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </Section>
        )}

        {/* ── COMMITMENTS ───────────────────────────────────────────────────────────────── */}
        <Section spacing="default" width="wide" aria-labelledby="about-commitments">
          <SectionHeader
            id="about-commitments"
            scale="2"
            kicker="Nos engagements"
            title="Ce sur quoi vous pouvez compter"
            subtitle="Quatre promesses concrètes — celles que nous tenons sur chaque commande."
          />
          {/* ── A ROW ON A PHONE, A CARD FROM `sm` ──────────────────────────────────────
              As four stacked cards these measured 1,053px at 390 — 263px each, for five lines of
              text — because a vertical card spends a full row on its icon and another on its
              title, and on a 358px column that is 40% of the card's height before a word is read.
              Laid out horizontally the same four come to ~440px and lose nothing: the icon sits
              beside the text where a phone has width to spare and no height to spare.

              ONE node, not two rendered copies — `sm:block` returns it to the card. */}
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {COMMITMENTS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-3.5 rounded-2xl border border-hairline bg-elevated p-4 transition-colors hover:border-brand/40 sm:block sm:p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunken text-brand sm:h-11 sm:w-11">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0 sm:mt-4">
                  <h3 className="font-display text-[15px] font-bold uppercase tracking-wide text-ink-1 sm:text-base">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2 sm:mt-2">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── WHERE THE SHOP IS ─────────────────────────────────────────────────────────── */}
        <Section surface="sunken" spacing="default" width="wide" aria-labelledby="about-store">
          <SectionHeader
            id="about-store"
            scale="2"
            kicker="Notre boutique"
            title="Où nous trouver"
            subtitle="Un magasin physique à Sousse, ouvert six jours sur sept — et une équipe au téléphone."
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
            <div className="min-w-0 rounded-2xl border border-hairline bg-elevated p-5 sm:p-6">
              <dl className="divide-y divide-rule">
                <StoreRow icon={MapPin} label="Adresse">
                  <span className="break-words">{address}</span>
                </StoreRow>
                <StoreRow icon={Clock} label="Horaires">
                  <span className="block"><span className="inline-flex items-center gap-1.5">
                      Lundi
                      <ArrowRight className="h-3.5 w-3.5 text-brand" strokeWidth={2} aria-hidden="true" />
                      Samedi
                    </span>
                    {' : 10 h – 19 h 30'}</span>
                  <span className="block">Dimanche : 14 h – 19 h</span>
                </StoreRow>
                <StoreRow icon={Phone} label="Téléphone">
                  {phoneList.map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/\s/g, '')}`}
                      className="block transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      {p}
                    </a>
                  ))}
                </StoreRow>
                <StoreRow icon={Mail} label="Email">
                  <a
                    href={`mailto:${email}`}
                    className="break-all transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {email}
                  </a>
                </StoreRow>
              </dl>
            </div>

            <MapPanel
              embedHtml={coordinates?.gelocalisation}
              address={address}
              className="min-w-0"
              mapClassName="h-56 sm:h-72 lg:h-80"
            />
          </div>
        </Section>

        {/* ── CTA ───────────────────────────────────────────────────────────────────────── */}
        <Section spacing="feature" width="wide" last>
          <div className="mx-auto max-w-3xl text-center">
            <span className="pt-kicker mb-3 inline-flex items-center gap-2.5 text-brand">
              <span className="h-px w-5 bg-brand" aria-hidden="true" />
              Rejoignez-nous
            </span>
            <h2 className="font-display font-compressed text-[1.875rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[2.5rem]">
              Prêt à commander ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-2 sm:text-base">
              Athlète confirmé, passionné de fitness ou tout à fait débutant — dites-nous votre objectif et nous
              vous dirons quoi prendre, et surtout quoi ne pas prendre.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/shop"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand px-6 font-display text-sm font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Package className="h-4 w-4" aria-hidden="true" /> Découvrir nos produits
              </Link>
              <Link
                href="/contact"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-rule px-6 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> Nous contacter
              </Link>
            </div>
          </div>
        </Section>
      </main>
      <ScrollToTop />
    </div>
  );
}

function StoreRow({
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
