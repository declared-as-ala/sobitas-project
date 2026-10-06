import { ArrowRight, MessageCircle, Search, Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { ShopBreadcrumbs } from '@/app/components/ShopBreadcrumbs';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { DELIVERY, LEGAL_IDENTITY } from '@/util/company';
import { BrandDirectory } from './BrandDirectory';
import { FeaturedBrands } from './FeaturedBrands';
import { toDirectoryEntries, type BrandEntry } from './brandEntries';
import type { BrandRayon, BrandStock } from './brandRayons';

/**
 * /brands.
 *
 * ── THE BRIEF ──────────────────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026, with a full-page screenshot: *"the brands page looks glorious, disgusting …
 * looks some kind of a bad thing. There is a lot of white space. We are not using any black
 * things in it. I want to literally redesign it, search the web, look how other people make the
 * /brands page, make it better performance and easy for users to see what brands we have, make
 * it the best for the SEO also, add some content from you."*
 *
 * ── THE SHAPE ──────────────────────────────────────────────────────────────────────────────
 * The hybrid that large-catalogue retailers converge on, and that NN/G describes in "Traditional
 * and Hybrid Category Pages": a small FEATURED tier that shows what the shop is known for, over
 * a dense ALPHABETICAL INDEX that carries everything, with in-page anchors.
 *
 *   1. Fil d’Ariane    Accueil › Marques — rendered, because the BreadcrumbList says it is
 *   2. Hero            the H1, the numbers, the page's one dark object
 *   3. Marques phares  24 logo plates (search demand first) + a text row for logo-less demand
 *   4. Par rayon       8 category cards — the page's only links INTO the money categories
 *   5. Répertoire      every brand, A–Z, with counts and availability
 *   6. Acheter         three practical cards, every delivery figure from DELIVERY
 *   7. Questions       the FAQ, also emitted as FAQPage, then the closing call to action
 *
 * ── WHAT THE 05/10/2026 PASS CHANGED, AND WHY ──────────────────────────────────────────────
 * /brands climbed from 48.1 to 17.7 in 28 days and sits #5 for `marques protéine tunisie`. Google
 * ignored the meta description and built the snippet from the featured band's subtitle plus the
 * FIRST LOGO'S ALT — « JX FITNESS — marque de compléments alimentaires en Tunisie… », a gym-
 * equipment brand described as a supplement brand. So: the H1 and intro now say what the page
 * is in the words people search, the plates open on the brands people actually click, the alts
 * are « Logo {Marque} », and the « Repères » band lost its hand-written brand notes — five of
 * them named products the catalogue does not carry (Outlift, Anabol, Animal Flex, OstroVit
 * bêta-alanine, BioTech packs: 0 references each, checked against the live API).
 *
 * ── ON "WE ARE NOT USING ANY BLACK THINGS" ─────────────────────────────────────────────────
 * tokens.css v6 bans a full-width dark CONTENT band above the footer. The black arrives as
 * OBJECTS — the hero plate and the closing plate, two `.pt-slab` panels inset in the rail. The
 * featured tier stays light, because a brand logo is artwork somebody else's designer set on
 * white.
 */

/**
 * « Les marques par rayon » — eight cards, each a category page and the brands that fill it.
 *
 * ── WHY IT LIVES IN THIS FILE AND NOT IN `BrandRayons.tsx` ─────────────────────────────────
 * Its loader is `brandRayons.ts`. A sibling `BrandRayons.tsx` differs from it only in case, and on
 * a case-insensitive disk (every Windows checkout of this repo) TypeScript resolves
 * `./BrandRayons` to the `.ts` loader first: TS1149, and the component "has no export". So the
 * component is here, one import away from nothing.
 *
 * SERVER COMPONENT, on purpose. It is ~60 links and no state: as a client island every one of
 * them would be paid for twice (HTML + flight payload) on a page whose weight is already the
 * A–Z directory. Plain `<Link prefetch={false}>` for the same reason the directory uses it — 60
 * viewport prefetches on a page people scroll through quickly is 60 requests nobody asked for.
 *
 * Every number on a card is a count of API rows (see brandRayons.ts). Nothing renders when the
 * loader returned no rayon, so an API outage costs this band, never the page.
 */

/** « 1 produit », « 2 produits ». */
function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString('fr-FR')} ${n === 1 ? singular : pluralForm}`;
}

/**
 * A rayon label in running text: « whey protéine », « pré-workout » — but « BCAA » stays an
 * acronym. `toLocaleLowerCase('fr')` alone printed « Tout le rayon bcaa ».
 */
export function rayonLabelInSentence(label: string): string {
  return label
    .split(' ')
    .map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLocaleLowerCase('fr')))
    .join(' ');
}

export function BrandRayons({
  rayons,
  surface = 'base',
}: {
  rayons: BrandRayon[];
  /** Set by the page, which owns the canvas ⇄ sunken alternation. */
  surface?: 'base' | 'sunken';
}) {
  if (rayons.length === 0) return null;

  return (
    <Section
      id="rayons"
      surface={surface}
      spacing="default"
      width="wide"
      aria-labelledby="rayons-titre"
    >
      <SectionHeader
        id="rayons-titre"
        title="Les marques par rayon"
        subtitle="Les marques de chaque rayon, celles qui ont du stock aujourd’hui en premier, avec leur nombre de références."
        scale="2"
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rayons.map((rayon) => (
          <li
            key={rayon.slug}
            className="flex min-w-0 flex-col rounded-xl border border-hairline bg-elevated px-4 pb-2 pt-4"
          >
            <h3 className="font-display text-[15px] font-bold uppercase tracking-wide text-ink-1">
              {rayon.label}
            </h3>
            <p className="mt-1 text-[12px] tabular-nums text-ink-3">
              {plural(rayon.brandCount, 'marque')} · {plural(rayon.productCount, 'produit')}
            </p>

            <ul className="mt-2 flex-1">
              {rayon.brands.map((brand) => (
                <li key={brand.id} className="border-b border-hairline">
                  <Link
                    href={`/${brand.slug}`}
                    prefetch={false}
                    className="group flex min-h-11 items-center rounded-md py-1.5 text-[13.5px] leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <span className="min-w-0">
                      <span className="font-semibold text-ink-1 transition-colors group-hover:text-brand">
                        {brand.name}
                      </span>
                      <span className="tabular-nums text-ink-3">
                        {` — ${plural(brand.count, 'produit')}`}
                      </span>
                      {brand.inStock > 0 && (
                        <span className="font-semibold tabular-nums text-ok">
                          {` (${brand.inStock.toLocaleString('fr-FR')} en stock)`}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={rayon.url}
              prefetch={false}
              className="group mt-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-brand transition-colors hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Tout le rayon {rayonLabelInSentence(rayon.label)}
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** The page's one H1, also the CollectionPage `name` in page.tsx — one string, two places. */
export const BRANDS_H1 = 'Marques de protéines et compléments en Tunisie';

type FaqItem = { q: string; a: string };

/** « A, B et C ». */
function joinFr(items: ReadonlyArray<string>): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

function references(n: number): string {
  return `${n.toLocaleString('fr-FR')} référence${n === 1 ? '' : 's'}`;
}

/** « Optimum Nutrition (25 références), MuscleTech (11) et … » — the unit once, then bare counts. */
function leaderList(
  brands: ReadonlyArray<{ name: string; count: number }>,
  unitOnFirst: boolean
): string {
  return joinFr(
    brands.map((b, i) =>
      i === 0 && unitOnFirst ? `${b.name} (${references(b.count)})` : `${b.name} (${b.count.toLocaleString('fr-FR')})`
    )
  );
}

/**
 * The page's own questions and answers. Rendered visibly AND emitted as FAQPage — Google
 * requires the two to match, which is why page.tsx calls this ONCE and hands the same array to
 * both. Every number comes from the API reads the page already made; a clause whose data is
 * missing is dropped rather than written with a guess.
 *
 * « Les plus fournies » is read from `rayon.leaders`, which is sorted by REFERENCE COUNT — the
 * only order in which that phrase is true. The cards rank by stock; see brandRayons.ts.
 */
export function brandFaq(
  entries: ReadonlyArray<BrandEntry>,
  rayons: ReadonlyArray<BrandRayon>,
  stock: BrandStock
): FaqItem[] {
  const faq: FaqItem[] = [];
  const brandCount = entries.length;
  const stockKnown = Object.keys(stock.byBrand).length > 0;
  const inStockBrands = entries.filter((e) => e.stock > 0).length;
  const rayon = (slug: string) => rayons.find((r) => r.slug === slug);

  // Q1 — the count. Skipped outright when the brand list failed: « 0 marques » is not an answer.
  if (brandCount > 0) {
    faq.push({
      q: 'Combien de marques trouve-t-on sur Protein.tn ?',
      a:
        `${brandCount.toLocaleString('fr-FR')} marques de protéines et de compléments alimentaires sont au catalogue` +
        (stockKnown && inStockBrands > 0
          ? `, dont ${inStockBrands.toLocaleString('fr-FR')} avec au moins un produit en stock aujourd’hui`
          : '') +
        '. Chaque marque a sa page avec toutes ses références et leur prix en dinars.',
    });
  }

  // Q2 — whey. Two clauses, each dropped when its rayon did not load; the question goes with both.
  const whey = rayon('whey-proteine');
  const isolate = rayon('whey-isolate');
  const wheyClauses: string[] = [];
  if (whey && whey.leaders.length > 0) {
    const label = rayonLabelInSentence(whey.label);
    wheyClauses.push(
      whey.leaders.length === 1
        ? `Au rayon ${label}, la marque la plus fournie est ${leaderList(whey.leaders, true)}.`
        : `Au rayon ${label}, les marques les plus fournies sont ${leaderList(whey.leaders, true)}.`
    );
  }
  if (isolate && isolate.leaders.length > 0) {
    wheyClauses.push(
      `En ${rayonLabelInSentence(isolate.label)} : ${leaderList(isolate.leaders.slice(0, 2), wheyClauses.length === 0)}.`
    );
  }
  if (wheyClauses.length > 0) {
    faq.push({
      q: 'Quelles marques de whey protéine trouve-t-on sur Protein.tn ?',
      a: wheyClauses.join(' '),
    });
  }

  // Q3 — creatine, then what of it ships today. The stock clause lists brands in the card's own
  // order (stock first) and says « entre autres » when more brands have stock than it names.
  const creatine = rayon('creatine');
  if (creatine && creatine.leaders.length > 0) {
    const label = rayonLabelInSentence(creatine.label);
    const verb = creatine.leaders.length === 1 ? 'est la plus fournie' : 'sont les plus fournies';
    let answer = `Au rayon ${label}, ${leaderList(creatine.leaders, true)} ${verb}`;
    const named = creatine.brands.filter((b) => b.inStock > 0).slice(0, 3);
    if (stockKnown && named.length > 0) {
      const withStock = Object.values(stock.byCategory[creatine.slug] ?? {}).filter((n) => n > 0).length;
      const more = withStock > named.length ? ', entre autres' : '';
      answer += ` ; en stock aujourd’hui${more} : ${joinFr(named.map((b) => b.name))}`;
    }
    faq.push({ q: 'Quelles marques de créatine sont disponibles ?', a: `${answer}.` });
  }

  faq.push(
    {
      q: 'Les produits vendus sont-ils authentiques ?',
      a: `Tous les produits sont importés et vendus par ${LEGAL_IDENTITY.shortLegalName} (registre de commerce ${LEGAL_IDENTITY.registreCommerce}), société enregistrée à ${LEGAL_IDENTITY.city} et active depuis ${LEGAL_IDENTITY.foundedYear}. Vous pouvez voir les produits et retirer votre commande directement en boutique.`,
    },
    {
      q: 'Et si ma marque n’est pas dans la liste ?',
      a: "Écrivez-nous : nous sourçons régulièrement de nouvelles références à la demande. Indiquez la marque et le produit exact, nous revenons vers vous sur la disponibilité et le délai.",
    },
    {
      q: 'Comment se passe la livraison ?',
      a:
        `Livraison en ${DELIVERY.windowLabel} dans les 24 gouvernorats : ${DELIVERY.feeDt} DT, offerte dès ${DELIVERY.freeFromDt} DT` +
        (DELIVERY.cashOnDelivery ? ', avec paiement à la livraison' : '') +
        '. Un numéro de suivi vous est transmis dès l’expédition.',
    }
  );

  return faq;
}

/**
 * Surfaces after the hero, in render order. Alternation is canvas ⇄ sunken and the hero is
 * canvas, so the first band after it is sunken. Computed rather than written per band because
 * two of the bands are conditional: if the rayon read fails, the plates and the directory would
 * otherwise be two adjacent sunken bands with no seam between them.
 */
type BandKey = 'featured' | 'rayons' | 'directory' | 'buy' | 'faq';
function bandSurfaces(present: ReadonlyArray<BandKey>): Record<BandKey, 'sunken' | 'base'> {
  const out = {} as Record<BandKey, 'sunken' | 'base'>;
  present.forEach((key, i) => {
    out[key] = i % 2 === 0 ? 'sunken' : 'base';
  });
  return out;
}

interface BrandsPageContentProps {
  entries: BrandEntry[];
  featured: BrandEntry[];
  textFeatured: BrandEntry[];
  rayons: BrandRayon[];
  faq: ReadonlyArray<FaqItem>;
  hasCounts: boolean;
  hasStockData: boolean;
  totalProducts: number;
  inStockBrandCount: number;
}

export function BrandsPageContent({
  entries,
  featured,
  textFeatured,
  rayons,
  faq,
  hasCounts,
  hasStockData,
  totalProducts,
  inStockBrandCount,
}: BrandsPageContentProps) {
  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const hasFeatured = featured.length > 0 || textFeatured.length > 0;
  const surfaces = bandSurfaces(
    [
      hasFeatured ? 'featured' : null,
      rayons.length > 0 ? 'rayons' : null,
      'directory',
      'buy',
      'faq',
    ].filter((k): k is BandKey => k !== null)
  );

  return (
    /* The storefront layout renders header and footer only, so this is the page's one <main>. */
    <main>
      {/* `strip` is the one-row band step, and `first` because this row sits against the header —
          the hero band below keeps its own `first` and draws no seam, which is right: a crumb row
          and the page head it introduces read as one block. The visible labels « Accueil » and
          « Marques » are the BreadcrumbList names in page.tsx, character for character. */}
      <Section spacing="strip" width="wide" first>
        <ShopBreadcrumbs items={[{ label: 'Marques' }]} />
      </Section>

      {/*
        ── THE PLATE ─────────────────────────────────────────────────────────────────────────
        `spacing="tight"` and not `feature`: the plate owns its own internal padding, so a band
        step on top of it is padding twice.
      */}
      <Section spacing="tight" width="wide" first aria-labelledby="marques-titre">
        <div className="pt-slab overflow-hidden rounded-2xl border border-hairline px-5 py-8 sm:rounded-3xl sm:px-8 sm:py-10 lg:px-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-2.5 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-brand">
                Le catalogue
              </p>
              <h1
                id="marques-titre"
                className="font-display font-compressed text-[2rem] font-extrabold uppercase leading-[0.94] tracking-[-0.02em] text-ink-1 lg:text-[3rem]"
              >
                {BRANDS_H1}
              </h1>
              {/* The page's snippet candidate: Google ignored the meta description and quoted
                  the band under this one. This paragraph now says what the page is first. */}
              <p className="mt-3.5 text-[15px] leading-relaxed text-ink-2">
                Optimum Nutrition, Dymatize, BioTech USA, MuscleTech… Chaque marque de nutrition
                sportive (whey, créatine, pré-workout, gainers) et de compléments santé a sa page :
                catalogue complet et prix en dinars. Livraison dans les 24 gouvernorats, offerte
                dès {DELIVERY.freeFromDt} DT.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <a
                  href="#repertoire"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-5 font-display text-[13px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Chercher une marque
                </a>
                {hasFeatured && (
                  <a
                    href="#vedette"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rule px-5 text-[13px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand"
                  >
                    Marques phares
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/*
              THE THREE NUMBERS ARE MEASURED, NOT ROUNDED UP. They come from the same fetches the
              page below renders, so they cannot drift from it.
            */}
            <dl className="flex shrink-0 gap-6 border-t border-rule pt-5 sm:gap-9 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  Marques
                </dt>
                <dd className="font-display font-compressed text-[1.75rem] font-extrabold tabular-nums leading-none text-ink-1 lg:text-[2.25rem]">
                  {fmt(entries.length)}
                </dd>
              </div>
              {totalProducts > 0 && (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Produits
                  </dt>
                  <dd className="font-display font-compressed text-[1.75rem] font-extrabold tabular-nums leading-none text-ink-1 lg:text-[2.25rem]">
                    {fmt(totalProducts)}
                  </dd>
                </div>
              )}
              {hasStockData && inStockBrandCount > 0 && (
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    En stock
                  </dt>
                  <dd className="font-display font-compressed text-[1.75rem] font-extrabold tabular-nums leading-none text-ok lg:text-[2.25rem]">
                    {fmt(inStockBrandCount)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </Section>

      {/* ── THE LOGO TIER, THEN THE BRANDS WITH DEMAND AND NO LOGO ─────────────────────────── */}
      {hasFeatured && (
        <Section
          id="vedette"
          surface={surfaces.featured}
          spacing="default"
          width="wide"
          aria-labelledby="vedette-titre"
        >
          <SectionHeader
            id="vedette-titre"
            title="Nutrition sportive : marques phares"
            subtitle="Les marques les plus recherchées sur Protein.tn, puis celles qui ont le plus de produits en stock aujourd’hui."
            scale="2"
          />
          <FeaturedBrands brands={featured} />

          {textFeatured.length > 0 && (
            <div className={featured.length > 0 ? 'mt-6' : undefined}>
              <h3 className="mb-1 font-display text-[15px] font-bold uppercase tracking-wide text-ink-1">
                Autres marques phares
              </h3>
              <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-4">
                {textFeatured.map((brand) => (
                  <li key={brand.id} className="border-b border-hairline">
                    <Link
                      href={`/${brand.slug}`}
                      prefetch={false}
                      className="group flex min-h-11 items-center gap-1.5 rounded-md py-1.5 text-[13.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <span className="font-semibold text-ink-1 transition-colors group-hover:text-brand">
                        {brand.name}
                      </span>
                      <span className="tabular-nums text-ink-3">
                        {` · ${fmt(brand.count)} produit${brand.count === 1 ? '' : 's'}`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* ── THE RAYONS: the page's links into the eight money categories ─────────────────── */}
      <BrandRayons rayons={rayons} surface={surfaces.rayons} />

      {/* ── THE INDEX ─────────────────────────────────────────────────────────────────────── */}
      <Section
        id="repertoire"
        surface={surfaces.directory}
        spacing="default"
        width="wide"
        aria-labelledby="repertoire-titre"
      >
        <SectionHeader
          id="repertoire-titre"
          title="Répertoire des marques de A à Z"
          subtitle={
            hasCounts
              ? 'Toutes les marques ayant au moins un produit publié, classées de A à Z. Le nombre à droite est le total de produits ; le point vert signale une disponibilité immédiate.'
              : 'Toutes nos marques, classées de A à Z.'
          }
          scale="2"
        />
        <BrandDirectory
          entries={toDirectoryEntries(entries)}
          hasCounts={hasCounts}
          hasStockData={hasStockData}
          inStockBrandCount={inStockBrandCount}
          surface={surfaces.directory}
        />
      </Section>

      {/* ── BUYING ────────────────────────────────────────────────────────────────────────── */}
      <Section surface={surfaces.buy} spacing="default" width="wide" aria-labelledby="acheter-titre">
        <SectionHeader id="acheter-titre" title="Acheter vos marques sur Protein.tn" scale="3" />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Store,
              title: 'Deux catalogues, une seule liste',
              body: 'La nutrition sportive — whey, créatine, pré-workout, gainers — et les compléments santé : vitamines, minéraux, oméga 3, plantes. Les deux familles cohabitent dans ce répertoire, classées de A à Z et par rayon.',
            },
            {
              icon: Search,
              title: 'Une page par marque',
              body: 'Chaque nom de cette liste mène au catalogue complet de la marque, filtrable par prix, arôme et catégorie, avec les mêmes prix et la même disponibilité que le reste de la boutique.',
            },
            {
              icon: Truck,
              title: 'Commander, où que vous soyez',
              body:
                `Livraison en ${DELIVERY.windowLabel} dans les 24 gouvernorats : ${DELIVERY.feeDt} DT, offerte dès ${DELIVERY.freeFromDt} DT` +
                (DELIVERY.cashOnDelivery ? ', paiement à la livraison' : '') +
                `. La boutique physique est à ${LEGAL_IDENTITY.city} si vous préférez voir le produit avant de l’acheter.`,
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-hairline bg-elevated p-5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className="mb-1.5 font-display text-[15px] font-bold uppercase tracking-wide text-ink-1">
                {title}
              </h3>
              <p className="text-[13.5px] leading-relaxed text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── QUESTIONS, THEN THE CLOSE ─────────────────────────────────────────────────────── */}
      <Section surface={surfaces.faq} spacing="default" width="wide" last aria-labelledby="faq-titre">
        <SectionHeader id="faq-titre" title="Questions fréquentes" scale="3" />

        {/*
          `<details>` rather than a state hook: static copy, and an accordion is the one
          interaction the platform does natively. The answers are in the DOM for a crawler, open
          or closed, beside the FAQPage block built from this same array.
        */}
        <div className="grid gap-2 lg:grid-cols-2">
          {faq.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-hairline bg-elevated px-4 py-3 [&[open]]:border-brand/30"
            >
              <summary className="-my-3 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-ink-1 marker:hidden [&::-webkit-details-marker]:hidden">
                {q}
                <span
                  className="relative h-4 w-4 shrink-0 text-ink-3 transition-colors group-open:text-brand"
                  aria-hidden="true"
                >
                  <span className="absolute left-0 top-1/2 h-[1.5px] w-4 -translate-y-1/2 rounded bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-[1.5px] -translate-x-1/2 rounded bg-current transition-transform duration-200 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="mt-2.5 border-t border-hairline pt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                {a}
              </p>
            </details>
          ))}
        </div>

        <div className="pt-slab mt-6 flex flex-col items-start gap-4 rounded-2xl border border-hairline px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <p className="font-display font-compressed text-[1.375rem] font-extrabold uppercase leading-tight tracking-[-0.01em] text-ink-1 lg:text-[1.625rem]">
              Vous ne trouvez pas votre marque ?
            </p>
            <p className="mt-1 text-[13.5px] text-ink-2">
              Dites-nous laquelle et quel produit exactement — nous sourçons de nouvelles
              références chaque mois.
            </p>
          </div>
          <Link
            href="/contact"
            prefetch={false}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-brand px-5 font-display text-[13px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Nous écrire
          </Link>
        </div>
      </Section>

      {/* The directory is ~14,000px tall on a phone — a reader who has scrolled to R genuinely
          needs a way back. */}
      <ScrollToTop />
    </main>
  );
}
