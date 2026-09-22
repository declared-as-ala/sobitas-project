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
import type { Product } from '@/types';

export type CrawlerListLink = { name: string; url: string };

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
        // formatTnd, not the card's rounded price: this string has to equal the `offers.price`
        // the route emits for the first six products, and Google only grants merchant-listing
        // eligibility when the marked-up price is visible on the page.
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 leading-relaxed text-gray-900">
      {/* Breadcrumbs */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm">
        <ol className="flex flex-wrap gap-1">
          {breadcrumbs.map((b, i) => (
            <li key={`${b.url}-${i}`} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {i < breadcrumbs.length - 1 ? (
                <a href={b.url} className="text-red-700 underline">
                  {categoryAnchor(b.url.replace(/^\//, ''), b.name)}
                </a>
              ) : (
                <span aria-current="page">{categoryAnchor(b.url.replace(/^\//, ''), b.name)}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <header>
        <h1 className="text-2xl font-bold">{heading}</h1>
      </header>

      {/* Editorial intro (expanded, no clamp) */}
      {introHtml && (
        <section aria-label="Présentation" className="my-4">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        </section>
      )}

      {/* Complete product link list — the crawlable internal-link graph the client grid
          hides behind hydration.
          ORDER MATTERS: this block sits directly under the intro, ahead of the buying guide and
          the FAQ, because the human page shows its grid after ~190 words while this view used to
          bury the list under ~2,850 (measured 22/09/2026 on /creatine, /whey-proteine,
          /mass-gainers). A listing whose first 90% is prose reads as an article, and an article
          loses transactional queries to the blog posts that really are articles. */}
      <section aria-label="Produits" className="my-6">
        <h2 className="text-lg font-semibold">
          {productLinks.length > 0
            ? `Produits (${productLinks.length})`
            : 'Produits'}
        </h2>
        {productLinks.length > 0 ? (
          <ul className="mt-2 list-disc pl-5">
            {productLinks.map((p, i) => (
              <li key={`${p.url}-${i}`} className="mt-2">
                {p.cover && (
                  // Plain <img>, as in CrawlerProductView: next/image would add JS and a loader
                  // round-trip to a route whose only visitor is a crawler.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.cover}
                    alt={p.alt}
                    width={300}
                    height={300}
                    loading="lazy"
                    className="h-auto w-24 rounded border"
                  />
                )}
                <a className="text-red-700 underline" href={p.url}>
                  {p.name}
                </a>{' '}
                — {p.price}
                {p.oldPrice && <> (au lieu de {p.oldPrice})</>} · {p.stockLabel}
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

      {/* "Comment choisir…" guide.
          Previously omitted, and with it most of the page. Measured before this change, the
          human /creatine rendered 1,605 words while the crawler view handed Googlebot 173 — the
          editorial guide, the buying advice and every FAQ were dropped, so Google judged the
          category on ~11% of its content. For a page whose whole job is to rank for
          "créatine tunisie", that was the single biggest thing holding it back. It is also a
          content-parity break: dynamic rendering is only defensible while both views say the
          same thing. */}
      {howToChooseTitle && howToChooseBody && (
        <section aria-label="Guide d'achat" className="my-6">
          <h2 className="text-lg font-semibold">{howToChooseTitle}</h2>
          <div
            className="prose prose-sm mt-2 max-w-none"
            dangerouslySetInnerHTML={{ __html: howToChooseBody }}
          />
        </section>
      )}

      {longBottomHtml && (
        <section aria-label="Informations complémentaires" className="my-6">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: longBottomHtml }}
          />
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
      {relatedCategories.length > 0 && (
        <section aria-label="Catégories associées" className="my-6">
          <h2 className="text-lg font-semibold">Catégories associées</h2>
          <ul className="mt-2 list-disc pl-5">
            {relatedCategories.map((c, i) => (
              <li key={`${c.url}-${i}`}>
                <a className="text-red-700 underline" href={c.url}>
                  {categoryAnchor(c.url.replace(/^\//, ''), c.name)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
