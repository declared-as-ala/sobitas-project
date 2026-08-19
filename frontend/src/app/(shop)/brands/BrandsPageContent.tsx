import { ArrowRight, MessageCircle, Search, Store, Truck } from 'lucide-react';
import Link from 'next/link';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import { LEGAL_IDENTITY } from '@/util/company';
import { BrandDirectory } from './BrandDirectory';
import { FeaturedBrands } from './FeaturedBrands';
import type { BrandEntry } from './brandEntries';

/**
 * /brands, rebuilt.
 *
 * ── THE BRIEF ──────────────────────────────────────────────────────────────────────────────
 * Owner, 19/08/2026, with a full-page screenshot: *"the brands page looks glorious, disgusting …
 * looks some kind of a bad thing. There is a lot of white space. We are not using any black
 * things in it. I want to literally redesign it, search the web, look how other people make the
 * /brands page, make it better performance and easy for users to see what brands we have, make
 * it the best for the SEO also, add some content from you."*
 *
 * ── WHAT THE PAGE WAS ──────────────────────────────────────────────────────────────────────
 * 589 aspect-square logo cards on a 1,024px rail inside a 1,536px window. 40,207px tall at
 * desktop, 81,851px on a phone, 11,952 DOM nodes — and 90% of the cards had no logo to show,
 * because only 57 brands in the catalogue have artwork. See BrandDirectory for the full reading.
 *
 * ── THE SHAPE IT TAKES INSTEAD ─────────────────────────────────────────────────────────────
 * The hybrid that large-catalogue retailers converge on, and that NN/G describes in "Traditional
 * and Hybrid Category Pages": a small FEATURED tier that shows what the shop is known for, over
 * a dense ALPHABETICAL INDEX that carries everything, with in-page anchors ("Anchors OK?
 * Re-Assessing In-Page Links" — Saks' designer index is the cited case).
 *
 *   1. Hero          the numbers, the search entry point, and the page's one dark surface
 *   2. En vedette    45 logo plates — the sports-nutrition roster
 *   3. Répertoire    577 text rows, A–Z, with counts and availability
 *   4. Repères       how to read the page, and the brands people actually ask for
 *   5. Questions     original Q&A, also emitted as FAQPage
 *
 * ── ON "WE ARE NOT USING ANY BLACK THINGS" ─────────────────────────────────────────────────
 * tokens.css v6 bans a full-width dark CONTENT band above the footer, and the ban is not
 * decorative: v5 painted six of them and the owner's own words about that page were that it hurt
 * to look at. The budget it sets is ~12% of painted area above the footer.
 *
 * So the black arrives as OBJECTS rather than as bands — the hero plate and the closing plate,
 * two `.pt-slab` panels inset in the rail, the same way the header's utility bar and the products
 * dropdown are dark without being bands. Measured after: ~8% of the document. The featured tier
 * deliberately stays light, because a brand logo is artwork somebody else's designer set on
 * white, and 45 of them on near-black is 45 logos with a halo.
 */

/**
 * One line per brand, written by hand, keyed by the EXACT `designation_fr` in the admin.
 *
 * ── WHY A KEYED MAP AND NOT GENERATED TEXT ─────────────────────────────────────────────────
 * This is the page's only prose about third parties, so every sentence has to be a statement
 * somebody can check — what the brand is known for in this shop's aisles, not invented corporate
 * history and never a health claim. A brand with no entry here simply does not appear in that
 * band; it is still in the directory and still linked. That is the failure mode you want from
 * editorial copy: missing, never wrong.
 */
const BRAND_NOTES: Readonly<Record<string, string>> = Object.freeze({
  'Optimum Nutrition':
    'La Gold Standard 100% Whey est le point de repère du rayon protéine — la whey à laquelle toutes les autres se comparent, ici comprise.',
  'BIOTECH USA':
    'Marque hongroise très implantée en Europe. Catalogue large : whey, Iso Whey Zero, créatine, vitamines et packs.',
  MUSCLETECH:
    'Nitro-Tech et Cell-Tech : des formules dosées haut, orientées prise de masse et force.',
  DYMATIZE:
    'ISO 100, une whey isolée et hydrolysée — le choix habituel quand les concentrés passent mal.',
  'NUTREX RESEARCH':
    'Outlift, Anabol, Lipo-6 : la partie stimulante du catalogue, pre-workout et brûleurs.',
  'Real Pharm':
    'Marque polonaise au rapport qualité-prix serré, sur la whey comme sur les acides aminés.',
  'Universal Nutrition':
    'Animal Pak, Animal Flex : des packs quotidiens hérités de la vieille école américaine.',
  OstroVit:
    'Beaucoup de formats mono-ingrédient — créatine, bêta-alanine, vitamines — à prix contenu.',
  Redcon1: 'Une gamme resserrée autour du pre-workout et de la protéine.',
  'KEVIN LEVRONE': 'Gammes signature de bodybuilding : whey, gainers et acides aminés.',
});

/** The page's own questions and answers. Rendered visibly AND emitted as FAQPage — Google
 *  requires the two to match, which is why this list is the single source for both. */
export const BRAND_FAQ: ReadonlyArray<{ q: string; a: string }> = Object.freeze([
  {
    q: 'Combien de marques sont disponibles sur Protein.tn ?',
    a: "Le catalogue référence plus de 570 marques ayant au moins un produit publié, de la nutrition sportive (whey, créatine, pre-workout, gainers) aux compléments de santé (vitamines, minéraux, oméga 3, plantes). Chacune possède sa propre page, avec l'intégralité de ses produits et les prix en dinars.",
  },
  {
    q: 'Que signifie le point vert à côté d’une marque ?',
    a: "Il indique qu'au moins un produit de cette marque peut être expédié aujourd'hui. Le nombre affiché à droite du nom est, lui, le total des produits publiés sous cette marque — une référence peut être publiée et momentanément indisponible.",
  },
  {
    q: 'Comment trouver rapidement une marque précise ?',
    a: "Utilisez le champ de recherche du répertoire : il filtre les marques à la frappe, sans accent ni casse à respecter. Vous pouvez aussi cliquer une lettre dans l'index A–Z pour sauter directement à cette section.",
  },
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
    a: 'Nous livrons les 24 gouvernorats de Tunisie, gratuitement à partir de 300 DT, avec paiement à la livraison. Un numéro de suivi vous est transmis dès l’expédition.',
  },
]);

interface BrandsPageContentProps {
  entries: BrandEntry[];
  featured: BrandEntry[];
  hasCounts: boolean;
  hasStockData: boolean;
  totalProducts: number;
  inStockBrandCount: number;
}

export function BrandsPageContent({
  entries,
  featured,
  hasCounts,
  hasStockData,
  totalProducts,
  inStockBrandCount,
}: BrandsPageContentProps) {
  const fmt = (n: number) => n.toLocaleString('fr-FR');

  const highlighted = featured
    .filter((b) => BRAND_NOTES[b.name])
    .slice(0, 8);

  return (
    <>
      {/*
        ── BAND 1 · THE PLATE ──────────────────────────────────────────────────────────────
        `spacing="tight"` and not `feature`: the plate owns its own internal padding, so a band
        step on top of it is padding twice. The whole hero is ~330px at desktop against the old
        page's 520px of centred heading, search field and three stat columns.
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
                Marques de protéines et compléments alimentaires
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-ink-2">
                Des références mondiales de la nutrition sportive aux laboratoires de compléments
                vitaminés. Chaque marque a sa page : catalogue complet, prix en dinars, et
                livraison dans les 24 gouvernorats.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <a
                  href="#repertoire"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-5 font-display text-[13px] font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Chercher une marque
                </a>
                <a
                  href="#vedette"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-rule px-5 text-[13px] font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand"
                >
                  Marques en vedette
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/*
              THE THREE NUMBERS ARE MEASURED, NOT ROUNDED UP. The old hero printed "589+ Marques ·
              100% Officielles · Rapide Livraison" — one inflated count and two claims that mean
              nothing because nothing could ever contradict them. These three come from the same
              fetches the page below renders, so they cannot drift from it.
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

      {/* ── BAND 2 · THE LOGO TIER ────────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <Section id="vedette" surface="sunken" spacing="default" width="wide">
          <SectionHeader
            title="Marques en vedette"
            subtitle="Les grandes marques de nutrition sportive du catalogue — protéines, créatine, pre-workout et gainers."
            scale="2"
          />
          <FeaturedBrands brands={featured} />
        </Section>
      )}

      {/* ── BAND 3 · THE INDEX ────────────────────────────────────────────────────────────── */}
      <Section id="repertoire" spacing="default" width="wide">
        <SectionHeader
          title="Répertoire des marques"
          subtitle={
            hasCounts
              ? 'Toutes les marques ayant au moins un produit publié, classées de A à Z. Le nombre à droite est le total de produits ; le point vert signale une disponibilité immédiate.'
              : 'Toutes nos marques, classées de A à Z.'
          }
          scale="2"
        />
        <BrandDirectory
          entries={entries}
          hasCounts={hasCounts}
          hasStockData={hasStockData}
          inStockBrandCount={inStockBrandCount}
        />
      </Section>

      {/* ── BAND 4 · THE EDITORIAL ────────────────────────────────────────────────────────── */}
      <Section surface="sunken" spacing="default" width="wide">
        <SectionHeader title="Repères" scale="3" />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Store,
              title: 'Deux catalogues, une seule liste',
              body: 'La nutrition sportive — whey, créatine, pre-workout, gainers — et les compléments de santé : vitamines, minéraux, oméga 3, plantes. Les deux familles cohabitent dans ce répertoire, et les marques en vedette ci-dessus sont la première.',
            },
            {
              icon: Search,
              title: 'Une page par marque',
              body: 'Chaque nom de cette liste mène au catalogue complet de la marque, filtrable par prix, arôme et catégorie, avec les mêmes prix et la même disponibilité que le reste de la boutique.',
            },
            {
              icon: Truck,
              title: 'Commander, où que vous soyez',
              body: 'Livraison dans les 24 gouvernorats, gratuite à partir de 300 DT, paiement à la livraison. La boutique physique est à Sousse si vous préférez voir le produit avant de l’acheter.',
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

        {highlighted.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-display font-compressed text-[1.375rem] font-extrabold uppercase leading-none tracking-[-0.01em] text-ink-1 lg:text-[1.75rem]">
              Les marques dont on nous parle le plus
            </h3>
            <ul className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
              {highlighted.map((brand) => (
                <li key={brand.id} className="border-b border-hairline py-3">
                  <Link
                    href={`/${brand.slug}`}
                    prefetch={false}
                    className="group inline-flex items-center gap-1.5 font-display text-[14px] font-bold uppercase tracking-wide text-ink-1 transition-colors hover:text-brand"
                  >
                    {brand.name}
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </Link>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                    {BRAND_NOTES[brand.name]}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* ── BAND 5 · QUESTIONS, THEN THE CLOSE ────────────────────────────────────────────── */}
      <Section spacing="default" width="wide" last>
        <SectionHeader title="Questions fréquentes" scale="3" />

        {/*
          `<details>` rather than a state hook: this band is six paragraphs of static copy on a
          page that already ships one client island, and an accordion is the one interaction the
          platform does natively. It also means the answers are in the DOM for a crawler with the
          markup Google expects beside the FAQPage block, open or closed.
        */}
        <div className="grid gap-2 lg:grid-cols-2">
          {BRAND_FAQ.map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-2xl border border-hairline bg-elevated px-4 py-3 [&[open]]:border-brand/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-ink-1 marker:hidden [&::-webkit-details-marker]:hidden">
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

      {/* The directory is 13,948px tall on a phone even after this rebuild — a page where a
          reader who has scrolled to R genuinely needs a way back. */}
      <ScrollToTop />
    </>
  );
}
