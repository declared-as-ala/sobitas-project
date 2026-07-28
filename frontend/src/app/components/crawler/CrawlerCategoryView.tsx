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
 * interactive page shows on its first data page). The canonical + robots on the route point
 * back at the real /{slug} URL. This is dynamic rendering, not cloaking. See util/isCrawler.ts.
 */

import { getProductLink } from '@/util/productUrl';
import type { Product } from '@/types';

export type CrawlerListLink = { name: string; url: string };

export function CrawlerCategoryView({
  title,
  introHtml,
  howToChooseTitle = null,
  howToChooseBody = null,
  longBottomHtml = null,
  faqs = [],
  breadcrumbs,
  products,
  subCategories = [],
  relatedCategories = [],
  kind,
}: {
  title: string;
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
  kind: 'category' | 'subcategory' | 'brand';
}) {
  const productLinks = (products ?? [])
    .filter((p) => p && p.designation_fr)
    .map((p) => ({ name: p.designation_fr as string, url: getProductLink(p) }))
    .filter((p) => p.url && p.url !== '/shop/');

  const heading =
    kind === 'brand'
      ? `Produits ${title}`
      : title;

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

      {/* Editorial intro (expanded, no clamp) */}
      {introHtml && (
        <section aria-label="Présentation" className="my-4">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
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

      {/* Complete product link list — the crawlable internal-link graph the client grid
          hides behind hydration. */}
      <section aria-label="Produits" className="my-6">
        <h2 className="text-lg font-semibold">
          {productLinks.length > 0
            ? `Produits (${productLinks.length})`
            : 'Produits'}
        </h2>
        {productLinks.length > 0 ? (
          <ul className="mt-2 list-disc pl-5">
            {productLinks.map((p, i) => (
              <li key={`${p.url}-${i}`}>
                <a className="text-red-700 underline" href={p.url}>
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">
            Aucun produit disponible pour le moment dans cette sélection.
          </p>
        )}
      </section>

      {/* Sub-categories under a top category (deeper crawl paths) */}
      {subCategories.length > 0 && (
        <section aria-label="Sous-catégories" className="my-6">
          <h2 className="text-lg font-semibold">Sous-catégories</h2>
          <ul className="mt-2 list-disc pl-5">
            {subCategories.map((c, i) => (
              <li key={`${c.url}-${i}`}>
                <a className="text-red-700 underline" href={c.url}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
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
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
