import { categoryAnchor } from '@/util/categoryAnchor';
import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wallet,
} from 'lucide-react';
import { buildFAQPageSchemaFromQA, validateStructuredData } from '@/util/structuredData';
import { htmlToText } from '@/util/sanitizeProductHtml';
import { CreatineComparisonTable, buildCreatineRows } from '@/app/components/product/CreatineComparisonTable';
import type { Brand, Product } from '@/types';

export interface RelatedLink {
  slug: string;
  name: string;
  url: string;
}

interface CategorySeoLandingProps {
  title: string;
  /** Canonical taxonomy slug; used to select the approved lightweight category artwork. */
  slug?: string;
  /** Admin banner remains a fallback for categories without approved local art. */
  banners?: { desktop?: string; mobile?: string };
  intro: string | null;
  longBottomHtml?: string | null;
  howToChooseTitle: string | null;
  howToChooseBody: string | null;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: RelatedLink[];
  bestProducts: RelatedLink[];
  /**
   * The products this page already fetched, for the comparison module below the grid.
   *
   * OPTIONAL AND INERT WHEN ABSENT. The module is mounted here rather than inside the grid so the
   * same block can sit between the product list and the buying guide in both renders; nothing is
   * fetched for it. A category that is not in `COMPARISON_SLUGS` ignores these entirely.
   */
  products?: Product[];
  /** Brand lookup for `brand_id`; the listing payload carries no brand object. See the table's
   *  docblock — without this the Marque column drops itself rather than printing blanks. */
  brands?: Brand[];
  withFaqSchema?: boolean;
  section?: 'header' | 'below-fold' | 'top' | 'bottom' | 'all';
}

const CATEGORY_ART: Record<string, string> = {
  proteines: '/media/category-art/proteines.png',
  'sante-vitalite': '/media/category-art/sante-vitalite.png',
  'perte-de-poids': '/media/category-art/perte-de-poids.png',
  performance: '/media/category-art/performance.png',
  equipement: '/media/category-art/equipement.png',
  'prise-de-masse': '/media/category-art/prise-de-masse.png',
};

/**
 * Categories that mount the price-comparison table under their grid.
 *
 * A SET, NOT A FLAG, and deliberately one entry long: the owner limited this round to /creatine
 * (22/09/2026). The table itself is category-agnostic — it reads price, format and the form printed
 * in the product name — but "the cheapest eight, cheapest first" is only a useful summary where the
 * products are near-substitutes, which is true of creatine tubs and false of, say, /equipement.
 * Adding a slug here is the whole cost of extending it, once somebody has looked at that
 * category's fill rates the way the table's docblock documents for this one.
 *
 * CrawlerCategoryView carries a matching copy (it derives the slug from its last breadcrumb) rather
 * than importing this one: that file is a lean, dependency-free server render for the bot route,
 * and importing this module would pull next/image and the icon set into it for one string. The two
 * lists must be changed together — the whole point of the gate is that both renders switch at once.
 */
export const COMPARISON_SLUGS: ReadonlySet<string> = new Set(['creatine']);

const TRUST_FACTS = [
  { icon: ShieldCheck, label: 'Produits authentiques' },
  { icon: Truck, label: 'Livraison 24–72 h' },
  { icon: Wallet, label: 'Paiement à la livraison' },
];

function renderContent(value: string): ReactNode {
  if (value.includes('<')) return <div dangerouslySetInnerHTML={{ __html: value }} />;

  return value
    .split(/\n\n+/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph, index) => <p key={index}>{paragraph.trim()}</p>);
}

export function CategorySeoLanding({
  title,
  slug,
  banners,
  intro,
  longBottomHtml,
  howToChooseTitle,
  howToChooseBody,
  faqs,
  relatedCategories,
  bestProducts,
  products = [],
  brands = [],
  withFaqSchema = true,
  section = 'all',
}: CategorySeoLandingProps) {
  const hasIntro = Boolean(intro?.trim());
  const hasLongBottom = Boolean(longBottomHtml?.trim());
  const hasHowTo = Boolean(howToChooseTitle?.trim() && howToChooseBody?.trim());
  const hasFaqs = faqs.length > 0;
  const showHeader = section === 'header' || section === 'top' || section === 'all';
  const showDetails = section === 'below-fold' || section === 'top' || section === 'all';
  const showLinks = section === 'below-fold' || section === 'bottom' || section === 'all';
  const localArt = slug ? CATEGORY_ART[slug] : undefined;
  const desktopArt = localArt || banners?.desktop?.trim() || banners?.mobile?.trim();
  const mobileArt = localArt || banners?.mobile?.trim() || banners?.desktop?.trim();
  /*
    ── THE COMPARISON GATE, AND WHY IT ALSO REQUIRES `brands` ────────────────────────────────────
    `products`/`brands` are optional here because this component is mounted by
    app/(shop)/category/[slug]/page.tsx, which does not pass them yet. Until it does, the block is
    inert — and CrawlerCategoryView applies the IDENTICAL gate, including the `brands` clause,
    although its own routes already hand it `products`.

    That is deliberate. Both renders switch on the same two props, so the table cannot appear for
    Googlebot on a page where a shopper does not get it: a bot-only module on a category page is
    the parity break this pair of components exists to prevent, and "it is only a re-presentation
    of the products already listed above" is an argument made after the fact, not a rule.

    `brands` is not a make-weight. The listing payload carries `brand_id` and no brand object, so
    without the lookup the Marque column drops itself on every row — one of the table's four
    columns, gone. Requiring it means the module never ships in its degraded form.

    `buildCreatineRows` is the table's own row builder, exported for exactly this: the table
    returns null below two rows, and a heading wrapped around null is an empty card. Asking the
    same function the same question beats rendering and then discovering the answer.
  */
  const showComparison =
    showDetails &&
    Boolean(slug && COMPARISON_SLUGS.has(slug)) &&
    brands.length > 0 &&
    buildCreatineRows(products, brands).length >= 2;
  const faqSchema = withFaqSchema && hasFaqs && showDetails ? buildFAQPageSchemaFromQA(faqs) : null;

  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <div className="space-y-5 lg:space-y-7">
      {faqSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      ) : null}

      {showHeader ? (
        <header className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-sm">
          {/*
            ── THE 232px FLOOR BELONGS TO THE ART, NOT TO THE CARD ──────────────────────────────
            `lg:min-h-[232px]` was unconditional while the panel it was sizing is conditional. Six
            categories have approved artwork (CATEGORY_ART) and the floor keeps the text column
            from sitting shorter than the image beside it — that is a real job, on those six.

            On every other category, including /creatine, `desktopArt` is undefined, the right-hand
            cell is never rendered, and the only thing 232px buys is 232px of empty card pushed
            between the H1 and the first product on every desktop viewport. That is the "big
            header" complaint, literally: a reservation for something that does not exist.

            Conditioned on `desktopArt` — the exact expression that decides whether the panel
            renders — so the six art categories are byte-identical and the rest collapse to the
            height of their own content.
          */}
          <div className={`grid grid-cols-1 lg:grid-cols-5${desktopArt ? ' lg:min-h-[232px]' : ''}`}>
            <div className="flex min-w-0 flex-col justify-center px-4 py-5 sm:p-6 lg:col-span-3 lg:px-8 lg:py-6">
              <p className="mb-2.5 flex items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-brand sm:text-[11px]">
                <span className="h-px w-5 bg-brand" aria-hidden="true" />
                Sélection Protein.tn
              </p>
              <h1 className="max-w-[21ch] text-balance font-display font-compressed text-[2rem] font-extrabold uppercase leading-[0.94] tracking-[-0.025em] text-ink-1 sm:text-[2.55rem] lg:text-[3rem]">
                {title}
              </h1>
              {hasIntro ? (
                <p className="mt-3 line-clamp-2 max-w-[68ch] text-[13.5px] leading-relaxed text-ink-2 sm:line-clamp-3 sm:text-[14.5px]">
                  {htmlToText(intro!, 520)}
                </p>
              ) : null}

              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-rule pt-3 sm:grid-cols-3">
                {TRUST_FACTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex min-h-8 items-center gap-2 text-[11.5px] font-semibold leading-tight text-ink-2 sm:text-[12px]">
                    <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {desktopArt ? (
              <div className="relative min-h-[155px] overflow-hidden bg-ink-1 sm:min-h-[205px] lg:col-span-2 lg:min-h-[232px]">
                <picture className="contents">
                  {mobileArt ? <source media="(max-width: 767px)" srcSet={mobileArt} /> : null}
                  <Image
                    src={desktopArt}
                    alt={`Sélection ${title}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 38vw"
                    priority={Boolean(localArt)}
                    quality={75}
                  />
                </picture>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      {/*
        ── THE COMPARISON SITS BETWEEN THE GRID AND THE PROSE ──────────────────────────────────
        The `below-fold` instance of this component is rendered by ShopPageClient immediately under
        the product grid, so the first block in this flow is the first thing after the last product
        card — which is exactly where a "which of these do I buy" table is useful and exactly where
        it stops being useful if it is below 500 words of guide.

        The same block sits in the same place in CrawlerCategoryView (after the product list and
        its pager, before "Comment choisir"). Same component, same rows, same order in both.
      */}
      {showComparison ? (
        /* No card chrome on this section: the table brings its own rounded, bordered, elevated
           scroller, and nesting that inside a second card is the card-in-card the design system
           calls out. Heading outside, card inside — the same shape as the FAQ block below. */
        <section aria-labelledby="category-comparison-title">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Comparatif</p>
          <h2
            id="category-comparison-title"
            className="mb-3 mt-1 font-display font-compressed text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl"
          >
            {/* Apposition, not a conjugated phrase: "Comparer les créatine" is what a template that
                tries to inline a category name into a sentence produces, and French category names
                are not reliably pluralisable from code. `Nom : verbe` reads correctly for every
                one of them, and the table's own lead sentence says what the rows are. */}
            {`${title} : comparer les prix`}
          </h2>
          <CreatineComparisonTable products={products} brands={brands} />
        </section>
      ) : null}

      {showDetails && (hasIntro || hasHowTo) ? (
        <section aria-labelledby="category-guide-title" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6 lg:p-8">
          {/*
            ── THE INTRO RENDERS IN FULL, TO EVERYONE ────────────────────────────────────────
            The header above prints `htmlToText(intro, 520)` behind a 2–3 line clamp, and the
            guide column below showed the intro ONLY when no buying guide existed. 49 of the 50
            category content files carry both, so on every one of them the rest of the intro
            reached nobody — except Googlebot, which is served `CrawlerCategoryView` and prints
            `introHtml` whole.

            Measured 22/09/2026 (Googlebot UA vs Chrome UA, 6-word-shingle diff of the visible
            text): /mass-gainers 1,016 bot-only words, /pre-workout 725, /whey-proteine 692,
            /creatine 417 — ~2,850 words on the four money categories that only a crawler could
            read, and the gap matches `intro.length - 520` on each file to within a few percent.
            Content a bot sees and a visitor cannot is the parity break dynamic rendering is not
            allowed to have, on exactly the pages that have to rank.

            It lands here rather than unclamped in the header because the header is the
            commercial lede above the grid (page standard: H1 → one sentence → products), so the
            body of the intro belongs with the rest of the editorial copy, below the fold.
            Guarded on `hasHowTo`: a category with no guide already rendered its intro in full in
            the column below, so those pages keep rendering exactly as they did.
          */}
          {hasIntro && hasHowTo ? (
            <div className="prose prose-neutral dark:prose-invert mb-6 max-w-none border-b border-rule pb-6 text-sm leading-relaxed text-ink-2 prose-headings:font-display prose-headings:text-ink-1 prose-a:text-brand sm:text-[15px]">
              {renderContent(intro!)}
            </div>
          ) : null}

          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Conseil d’achat</p>
              <h2 id="category-guide-title" className="mt-1 font-display font-compressed text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl">
                {howToChooseTitle?.trim() || `Bien choisir ${title.toLocaleLowerCase('fr')}`}
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            {/*
              ── `dark:prose-invert` IS NOT DECORATION, IT IS THE ONLY THING PAINTING THE BOLD ──
              `audit-contrast` on /creatine in dark mode: `#171717 on #141416`, 1.03:1, TEN TIMES.
              Every one of them was a `<strong>` inside this block.

              `text-ink-2` on the wrapper only sets the container's own colour. The typography
              plugin paints nested elements from its OWN variables, and `prose-neutral` hardcodes
              `--tw-prose-bold: #171717` — a near-black that never learns about the theme. On
              `bg-elevated` in dark mode that is black on black: the lead-in of every bullet in
              "Bien choisir…" — the words a shopper scans to find their own case — rendered
              invisible, while the sentence after each one read fine.

              Invisible to `lint:design` (no banned substring), invisible to review (the class
              string says `text-ink-2`), and invisible in a light-mode screenshot. It is the same
              failure mode as the 16 white-on-white badges, one theme over.

              `prose-invert` flips the whole variable set, which is what ArticleDetailClient
              already does for the same reason — the explicit `prose-headings:` / `prose-a:`
              overrides below still win, so nothing else moves.
            */}
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed text-ink-2 prose-headings:font-display prose-headings:text-ink-1 prose-a:text-brand sm:text-[15px]">
              {hasHowTo ? renderContent(howToChooseBody!) : hasIntro ? renderContent(intro!) : null}
            </div>
            <aside className="rounded-xl bg-sunken p-4 sm:p-5" aria-label="Pourquoi commander chez Protein.tn">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">L’essentiel</p>
              <ul className="mt-3 space-y-3">
                {[
                  'Vérifiez votre objectif et la portion conseillée.',
                  'Comparez le prix, le format et la disponibilité.',
                  'Besoin d’aide ? Notre équipe vous conseille.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>

        </section>
      ) : null}

      {showDetails && hasFaqs ? (
        <section aria-labelledby="category-faq-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Réponses rapides</p>
              <h2 id="category-faq-title" className="mt-1 font-display font-compressed text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl">
                Questions fréquentes
              </h2>
            </div>
            <span className="hidden text-sm text-ink-3 sm:inline">{faqs.length} réponses</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated divide-y divide-rule">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group">
                <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink-1 sm:px-6">
                  <span className="flex items-start gap-3 text-sm sm:text-[15px]">
                    <span className="mt-0.5 text-xs tabular-nums text-brand">{String(index + 1).padStart(2, '0')}</span>
                    {faq.question}
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="border-t border-rule bg-sunken px-4 py-4 ps-11 text-sm leading-relaxed text-ink-2 sm:px-6 sm:ps-[3.75rem] sm:text-[15px]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {showLinks && (relatedCategories.length > 0 || bestProducts.length > 0) ? (
        <section className="grid gap-4 md:grid-cols-2">
          <LinkList title="Rayons associés" icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} links={relatedCategories} />
          <LinkList title="Produits à découvrir" icon={<Star className="h-4 w-4" aria-hidden="true" />} links={bestProducts} />
        </section>
      ) : null}

      {/*
        ── THE LONG GUIDE IS LAST, AND IT MOVED OUT OF THE BUYING-GUIDE CARD ───────────────────
        It used to be a <details> stapled to the bottom of "Comment choisir…", which put the
        page's longest body of text — often a thousand words of CMS prose — between the buying
        advice and the FAQ, and above the lateral category links entirely.

        Nothing is removed and nothing is hidden that was not already hidden: it is the same
        closed <details> with the same summary. What changes is that the blocks a shopper is most
        likely to want next (the quick answers, then the neighbouring rayons) are no longer
        queued behind it, and the links out of this page are no longer the very last thing under
        the longest block on it. Order matched to CrawlerCategoryView, where the same section now
        sits last for the same reason.
      */}
      {showDetails && hasLongBottom ? (
        <section aria-label="Guide complet" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6 lg:p-8">
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-1">
              <span>Lire le guide complet</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <article
              /* `dark:prose-invert` is load-bearing — see the note on the guide column above. This
                 block is inside a closed <details>, so the contrast audit never opened it: it was
                 carrying the identical 1.03:1 bold and no guard could have said so. */
              className="prose prose-neutral dark:prose-invert mt-4 max-w-none border-t border-rule pt-4 text-sm leading-relaxed text-ink-2 prose-headings:font-display prose-headings:text-ink-1 prose-a:text-brand sm:text-[15px]"
              dangerouslySetInnerHTML={{ __html: longBottomHtml! }}
            />
          </details>
        </section>
      ) : null}
    </div>
  );
}

function LinkList({ title, icon, links }: { title: string; icon: ReactNode; links: RelatedLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink-1">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      <ul className="mt-3 divide-y divide-rule">
        {links.slice(0, 6).map((item) => (
          <li key={item.slug}>
            <Link href={item.url} className="group flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-ink-2 transition-colors hover:text-brand">
              <span className="line-clamp-1">{categoryAnchor(item.url.replace(/^\//, ''), item.name)}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
