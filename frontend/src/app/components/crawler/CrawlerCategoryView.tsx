/**
 * CrawlerCategoryView — the "Feed the Crawler First" render of a category / subcategory /
 * brand listing page.
 *
 * This is a PURE SERVER COMPONENT: no 'use client', no hooks, no useSearchParams, no
 * hydration. The interactive listing (ShopPageClient) calls useSearchParams() inside a
 * <Suspense> boundary, which triggers a client-side-rendering bailout — so the statically
 * generated HTML a crawler receives is only the skeleton fallback (no H1, no intro, no
 * product links). This route (reached via the middleware bot-rewrite) projects the SAME
 * listing into lean, fully server-rendered semantic HTML: one real <h1>, the editorial
 * intro, and a complete <ul> of crawlable product links.
 *
 * COMPLIANCE: content parity with the human page (same title, intro and products the
 * interactive page shows on its first data page) — and, since 22/09/2026, parity of ORDER and of
 * what each product entry says. The human grid shows an image, a price and a stock label after
 * ~190 words; this view showed a bare link list after ~2,850 and no image or price at all, while
 * the route emitted Product/Offer JSON-LD carrying those prices. Both halves are fixed here: the
 * product list sits directly under the intro, and each entry carries the cover, the price and the
 * stock label the card shows. The canonical + robots on the route point back at the real /{slug}
 * URL. This is dynamic rendering, not cloaking. See util/isCrawler.ts.
 */

import { getStorageUrl } from '@/services/api';
import { categoryAnchor } from '@/util/categoryAnchor';
import { buildProductAlt } from '@/util/productAlt';
import { formatTnd, getPriceDisplay } from '@/util/productPrice';
import { getProductStockStatus } from '@/util/cartStock';
import { getProductLink } from '@/util/productUrl';
import { CreatineComparisonTable, buildCreatineRows } from '@/app/components/product/CreatineComparisonTable';
import { WheyComparisonTable, buildWheyRows } from '@/app/components/product/WheyComparisonTable';
import type { Brand, Product } from '@/types';

export type CrawlerListLink = { name: string; url: string };

/**
 * Categories that mount the price-comparison table under their product list.
 *
 * A DELIBERATE COPY of the set in app/(shop)/category/CategorySeoLanding.tsx, not an import: that
 * module pulls next/image and the icon set, and this file is the lean server render the bot route
 * gets. The two lists must be edited together — the gate exists so both renders switch at once,
 * and a table that appears for Googlebot and not for a shopper is the parity break this whole
 * component is written to avoid.
 */
const COMPARISON_SLUGS: ReadonlySet<string> = new Set(['creatine', 'whey-proteine']);

/** The taxonomy slug this listing is, read off the breadcrumb trail's own last entry — which is
 *  this page. Neither call site passes a slug, and both build that last crumb as `/${cleanSlug}`. */
function slugFromBreadcrumbs(breadcrumbs: CrawlerListLink[]): string {
  const last = breadcrumbs[breadcrumbs.length - 1];
  return (last?.url ?? '')
    .replace(/^https?:\/\/(?:www\.)?protein\.tn\//i, '')
    .replace(/^\//, '')
    .split(/[?#]/, 1)[0]
    .replace(/\/$/, '');
}

export function CrawlerCategoryView({
  title,
  headingOverride,
  introHtml,
  howToChooseTitle = null,
  howToChooseBody = null,
  longBottomHtml = null,
  faqs = [],
  breadcrumbs,
  products,
  brands = [],
  subCategories = [],
  relatedCategories = [],
  pagination = null,
  kind,
}: {
  title: string;
  /** Optional editorial H1 for a measured landing page; `title` still names the taxonomy. */
  headingOverride?: string;
  introHtml?: string | null;
  /** Buying guide + FAQ, mirroring the human category page. Omitting these handed Googlebot
   *  roughly a tenth of the page's real content — see the note at the render site below. */
  howToChooseTitle?: string | null;
  howToChooseBody?: string | null;
  longBottomHtml?: string | null;
  faqs?: Array<{ question: string; answer: string }>;
  breadcrumbs: CrawlerListLink[];
  products: Product[];
  /** Optional brand lookup for the comparison table's Marque column; the listing payload carries
   *  `brand_id` but no brand object. Omitted, the column drops itself rather than printing blanks. */
  brands?: Brand[];
  subCategories?: CrawlerListLink[];
  relatedCategories?: CrawlerListLink[];
  /**
   * Crawlable pagination.
   *
   * ── WHY A BOT VIEW NEEDS A PAGER AT ALL ─────────────────────────────────────────────────────
   * This route exists because the human /shop hides its catalogue behind client state. It was then
   * given the WHOLE catalogue in one page, which solved that and created a second problem the
   * moment the iHerb import landed: 10,669 products as one flat list is a multi-megabyte document
   * that Googlebot truncates, and it says nothing about which products belong together.
   *
   * Twelve per page with real prev/next/numbered anchors — matching the human page exactly, which
   * is the parity rule this file's docblock insists on — gives the crawler a finite document and a
   * path it can walk to the last product. `buildHref` is supplied by the caller so the same
   * component serves /shop?page=N and any future paginated category view.
   */
  pagination?: { currentPage: number; totalPages: number; buildHref: (page: number) => string } | null;
  kind: 'category' | 'subcategory' | 'brand';
}) {
  const productLinks = (products ?? [])
    .filter((p) => p && p.designation_fr)
    .map((p) => {
      const price = getPriceDisplay(p);
      return {
        name: p.designation_fr as string,
        url: getProductLink(p),
        cover: p.cover ? getStorageUrl(p.cover) : '',
        alt: buildProductAlt(p),
        // Keep the exact TND value visible beside every crawlable product link.
        price: formatTnd(price.finalPrice),
        oldPrice: price.hasPromo && price.oldPrice ? formatTnd(price.oldPrice) : null,
        stockLabel: getProductStockStatus(p).stockLabel,
      };
    })
    .filter((p) => p.url && p.url !== '/shop/');

  const heading = headingOverride ||
    (kind === 'brand'
      ? `Produits ${title}`
      : title);

  /*
    ── THE GRID GETS A HEADING THAT NAMES THE GRID ──────────────────────────────────────────────
    It read "Produits (24)" on every one of these pages — a label that tells a reader nothing the
    <ul> under it does not, and tells a search engine nothing at all. The H1 is the only line on
    the page that says what the page is about, and the H1 is an editorial sentence; between it and
    the product list there was no heading carrying the category's own name.

    Built from `title` by apposition (`Nom en Tunisie : N produits au catalogue`) rather than by
    inlining the name into a sentence: French category names are not reliably pluralisable from
    code — "Créatine" would become "Créatine disponibles" — and a colon reads correctly for every
    one of the fifty, and for a brand listing too.

    "au catalogue", not "disponibles": this list includes out-of-stock products with their real
    stock labels, and a count of 24 under the word "disponibles" would be a claim the page itself
    contradicts three lines down. Every word here is already visible to a shopper — the category
    name is in the H1, the count is beside the human grid — so the two renders say the same thing.

    TWO CALL SITES ALREADY QUALIFY THEIR OWN TITLE. x-crawler/shop passes
    "Boutique — Protéines & Compléments Alimentaires en Tunisie", so a blind append gives
    "… en Tunisie en Tunisie", and since that title IS the h1 there, the qualified form would also
    restate the h1 word for word two lines below it. Both are handled: the suffix is added only
    when the title does not already carry it, and when the result equals the h1 the heading falls
    back to the plain count — on a page whose h1 already names the catalogue and the country, the
    grid label has nothing left to add.
  */
  const geoTitle = /\ben\s+tunisie\b/i.test(title) ? title : `${title} en Tunisie`;
  const gridHeading =
    productLinks.length === 0
      ? geoTitle
      : geoTitle === heading
        ? `Produits (${productLinks.length})`
        : `${geoTitle} : ${productLinks.length} produits au catalogue`;

  /*
    Same gate, same rows, same position as the human render — see COMPARISON_SLUGS above.

    `brands.length > 0` is the clause that keeps the two renders honest. This route already has
    `products`, so without it the table would light up for Googlebot while the human category page
    — whose own route does not pass either prop yet — showed nothing. That is a bot-only module on
    the one page in this cluster that has to rank, and no amount of "it only restates the grid"
    makes it something this component is allowed to do. Both renders now require the same two
    props, so they switch on together or not at all. It is not a make-weight either: the listing
    payload carries `brand_id` and no brand object, so an unresolved `brands` costs the table its
    Marque column outright.

    First page only: the table's promise is "the cheapest, cheapest first", and on page 2 it would
    rank the second dozen while saying that. The human page agrees by construction — its
    below-fold block is not rendered at all on a paginated URL.
  */
  const comparisonSlug = slugFromBreadcrumbs(breadcrumbs);
  const comparisonKind =
    kind !== 'brand' && COMPARISON_SLUGS.has(comparisonSlug) ? comparisonSlug : null;
  const comparisonRowCount =
    comparisonKind === 'creatine'
      ? buildCreatineRows(products ?? [], brands).length
      : comparisonKind === 'whey-proteine'
        ? buildWheyRows(products ?? [], brands).length
        : 0;
  const showComparison =
    comparisonKind !== null &&
    (!pagination || pagination.currentPage === 1) &&
    brands.length > 0 &&
    comparisonRowCount >= 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 leading-relaxed text-gray-900">
      {/* Breadcrumbs */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm">
        <ol className="flex flex-wrap gap-1">
          {/*
            ── THE CRUMB NAME IS RENDERED AS GIVEN. NO `categoryAnchor` HERE ────────────────────
            `categoryAnchor` turns a slug into a commercial anchor — "Protéines en Tunisie" for
            `proteines` — which is the right thing for an in-copy link and the wrong thing for a
            breadcrumb. It was rewriting every crumb, so this bot-only view announced
            "Accueil › Boutique › Protéines en Tunisie › Whey protéine" while the BreadcrumbList
            JSON-LD on the same response said "Protéines", and the shopper's render said
            "Protéines" too.

            Google reads a BreadcrumbList against the trail it can see; a visible trail that
            disagrees with its own markup is the defect, and a bot render that disagrees with the
            human render on the same URL is the worse one — this view exists to be identical to
            the shopper's page, not to be a better-optimised version of it. The names arriving in
            `breadcrumbs` are already the declared `catalogTaxonomy` labels, built by the same
            helper the human route uses.
          */}
          {breadcrumbs.map((b, i) => (
            <li key={`${b.url}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {i < breadcrumbs.length - 1 ? (
                <a href={b.url} className="text-red-700 underline">
                  {b.name}
                </a>
              ) : (
                <span aria-current="page">{b.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header>
        <h1 className="text-2xl font-bold">{heading}</h1>
      </header>

      {/* Complete product link list — the crawlable internal-link graph the client grid
          hides behind hydration.
          ORDER MATTERS: this block now sits immediately under the H1, matching the human page.
          The editorial introduction remains complete below the products beside the buying guide;
          it no longer delays the direct product links and packshots on a transactional query. */}
      <section aria-label="Produits" className="my-4">
        <h2 className="text-lg font-semibold">{gridHeading}</h2>
        {productLinks.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {productLinks.map((p, i) => (
              <li key={`${p.url}-${i}`} className="rounded border p-3">
                <a className="block text-red-700 underline" href={p.url}>
                  {p.cover && (
                    // Plain <img>, as in CrawlerProductView: next/image would add JS and a loader
                    // round-trip to a route whose only visitor is a crawler. The first row is eager
                    // so Google receives the leading category packshots without a lazy-load gate.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover}
                      alt={p.alt}
                      width={300}
                      height={300}
                      loading={i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="mx-auto h-auto w-32 rounded"
                    />
                  )}
                  <span className="mt-2 block font-semibold">{p.name}</span>
                </a>
                <p className="mt-1 text-sm">
                  {p.price}
                  {p.oldPrice && <> (au lieu de {p.oldPrice})</>} · {p.stockLabel}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            Aucun produit disponible pour le moment dans cette sélection.
          </p>
        )}
      </section>

      {/* Pagination — plain anchors, because this is the only route Googlebot has to the catalogue
          past page 1. Prev/next PLUS an explicit first and last: a crawler that only ever follows
          "next" needs 890 sequential fetches to reach the end of the shop, which no crawl budget
          covers, whereas a direct link to the last page lets it sample both ends. */}
      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="Pagination" className="my-6 border-t border-hairline pt-4">
          <p className="text-sm text-ink-3">
            Page {pagination.currentPage} sur {pagination.totalPages}
          </p>
          <ul className="mt-2 flex flex-wrap gap-3 text-sm">
            {pagination.currentPage > 1 && (
              <>
                <li>
                  <a className="text-brand underline" href={pagination.buildHref(1)} rel="first">
                    Première page
                  </a>
                </li>
                <li>
                  <a
                    className="text-brand underline"
                    href={pagination.buildHref(pagination.currentPage - 1)}
                    rel="prev"
                  >
                    Page précédente
                  </a>
                </li>
              </>
            )}
            {pagination.currentPage < pagination.totalPages && (
              <>
                <li>
                  <a
                    className="text-brand underline"
                    href={pagination.buildHref(pagination.currentPage + 1)}
                    rel="next"
                  >
                    Page suivante
                  </a>
                </li>
                <li>
                  <a
                    className="text-brand underline"
                    href={pagination.buildHref(pagination.totalPages)}
                    rel="last"
                  >
                    Dernière page ({pagination.totalPages})
                  </a>
                </li>
              </>
            )}
          </ul>
        </nav>
      )}

      {/* Price comparison — directly after the product list and its pager, before the guide.
          Identical markup to the human render: CreatineComparisonTable is a pure server component
          with no client code, written to be mounted in both. */}
      {showComparison && (
        <section aria-label="Comparatif" className="my-6">
          <h2 className="text-lg font-semibold">{`${title} : comparer les prix`}</h2>
          <div className="mt-2">
            {comparisonKind === 'whey-proteine' ? (
              <WheyComparisonTable products={products} brands={brands} />
            ) : (
              <CreatineComparisonTable products={products} brands={brands} />
            )}
          </div>
        </section>
      )}

      {/* Sub-categories under a top category (deeper crawl paths) */}
      {subCategories.length > 0 && (
        <section aria-label="Sous-catégories" className="my-6">
          <h2 className="text-lg font-semibold">Sous-catégories</h2>
          <ul className="mt-2 list-disc pl-5">
            {subCategories.map((c, i) => (
              <li key={`${c.url}-${i}`}>
                <a className="text-red-700 underline" href={c.url}>
                  {categoryAnchor(c.url.replace(/^\//, ''), c.name)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full editorial introduction + "Comment choisir…" guide, after products in both renders.
          Previously omitted, and with it most of the page. Measured before this change, the
          human /creatine rendered 1,605 words while the crawler view handed Googlebot 173 — the
          editorial guide, the buying advice and every FAQ were dropped, so Google judged the
          category on ~11% of its content. For a page whose whole job is to rank for
          "créatine tunisie", that was the single biggest thing holding it back. It is also a
          content-parity break: dynamic rendering is only defensible while both views say the
          same thing. */}
      {(introHtml || (howToChooseTitle && howToChooseBody)) && (
        <section aria-label="Guide d'achat" className="my-6">
          {introHtml && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          )}
          <h2 className={`${introHtml ? 'mt-6 ' : ''}text-lg font-semibold`}>
            {howToChooseTitle || `Bien choisir ${title.toLocaleLowerCase('fr')}`}
          </h2>
          {howToChooseBody && (
            <div
              className="prose prose-sm mt-2 max-w-none"
              dangerouslySetInnerHTML={{ __html: howToChooseBody }}
            />
          )}
        </section>
      )}

      {/* FAQ as real text. The FAQPage JSON-LD is emitted by the route, but the schema is only
          valid when the same Q&A is visible in the HTML — so it must live here, not only in the
          structured data. */}
      {faqs.length > 0 && (
        <section aria-label="Questions fréquentes" className="my-6">
          <h2 className="text-lg font-semibold">Questions fréquentes</h2>
          <dl className="mt-2">
            {faqs.map((f, i) => (
              <div key={`${f.question}-${i}`} className="mt-3">
                <dt className="font-semibold">{f.question}</dt>
                <dd className="prose prose-sm max-w-none">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Related categories (lateral internal links) */}
      {/*
          ── THE CURATED NAME WINS ON THIS RAIL, AND ONLY ON THIS RAIL ─────────────────────────
          `categoryAnchor` maps a slug to ONE fixed commercial label — /creatine is always
          "Créatine monohydrate en Tunisie". That is right for navigation, where a consistent
          scannable label beats variety, and it is what the sub-categories rail above still uses.

          It is wrong here. The names in `relatedCategories` are CURATED per source page —
          brandSeoConfig and the category content files deliberately give each linking page a
          different phrase for the same destination, because a hundred identical exact-match
          anchors is a footprint, not a strategy (commercialSeoMap.ts, rule 5). Re-labelling them
          here silently collapsed that work back to one string per destination across every brand
          page on the site, on the render that actually ranks.
      */}
      {relatedCategories.length > 0 && (
        <section aria-label="Catégories associées" className="my-6">
          <h2 className="text-lg font-semibold">Catégories associées</h2>
          <ul className="mt-2 list-disc pl-5">
            {relatedCategories.map((c, i) => (
              <li key={`${c.url}-${i}`}>
                <a className="text-red-700 underline" href={c.url}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The long-form CMS guide, LAST.
          It used to sit between "Comment choisir…" and the FAQ, which put the page's longest
          block of prose — a thousand words on the categories that have one — ahead of both the
          quick answers and the lateral category links. Those links are this view's whole reason
          for existing on a crawl budget: they are the paths out of this page into its neighbours,
          and they were buried under the one block nobody reads to the end.

          Mirrors the human render, where the same section is now the last block of
          CategorySeoLanding. Nothing was dropped; only the order changed. */}
      {longBottomHtml && (
        <section aria-label="Guide complet" className="my-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: longBottomHtml }}
          />
        </section>
      )}
    </main>
  );
}
