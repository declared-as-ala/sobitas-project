/**
 * CrawlerProductView — the "Feed the Crawler First" render of a product page.
 *
 * This is a PURE SERVER COMPONENT: no 'use client', no hooks, no hydration, no
 * client-side data fetching. It projects the exact same product the interactive
 * page shows (same name, price, description, reviews, specs) into lean, fully
 * server-rendered, semantic HTML with everything expanded inline.
 *
 * Why this helps indexing:
 *   • The complete content is present in the FIRST byte of HTML (no "crawled –
 *     currently not indexed" from thin client shells, no LCP hidden behind
 *     motion opacity:0).
 *   • Zero JavaScript → fast for Googlebot's render budget.
 *   • One clean H1, real breadcrumbs, all reviews and FAQ inline, complete
 *     internal links — the "all best practices on one page" the design can't
 *     always afford for humans.
 *
 * COMPLIANCE: content parity with the human page (see util/isCrawler.ts). Do not
 * add prices/text/keywords here that a user cannot see on the real page.
 */

import { getStorageUrl } from '@/services/api';
import { getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { sanitizeProductHtml } from '@/util/sanitizeProductHtml';
import { getProductBreadcrumbs, getProductLink } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import type { Product } from '@/types';

function formatTnd(n: number): string {
  return `${(Math.round(n * 1000) / 1000).toString().replace(/\.?0+$/, '')} DT`;
}

function reviewRating(r: { stars?: number; note?: number }): number {
  const v = typeof r.stars === 'number' ? r.stars : typeof r.note === 'number' ? r.note : 0;
  return Math.max(0, Math.min(5, v));
}

export function CrawlerProductView({
  product,
  similarProducts = [],
}: {
  product: Product;
  similarProducts?: Product[];
}) {
  const breadcrumbs = getProductBreadcrumbs(product);
  const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(product);
  const inStock = isInStock(product);
  const brandName = product.brand?.designation_fr;
  const cover = product.cover ? getStorageUrl(product.cover) : '';
  const descriptionHtml = sanitizeProductHtml(
    product.description_fr || product.description_cover || ''
  );
  const nutritionHtml = sanitizeProductHtml(product.nutrition_values || '');
  const aromas = product.aromes ?? [];
  const reviews = (product.reviews ?? []).filter(
    (r) => (r.publier === undefined || r.publier === 1) && reviewRating(r) >= 1
  );
  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + reviewRating(r), 0) / reviews.length) * 10) / 10
      : null;
  const faq = (product.faq ?? [])
    .map((f) => ({ q: (f.q || f.question || '').trim(), a: (f.a || f.answer || '').trim() }))
    .filter((f) => f.q && f.a);
  const sku = product.sku || product.code_product || String(product.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 leading-relaxed text-gray-900">
      {/* Breadcrumbs */}
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm">
        <ol className="flex flex-wrap gap-1">
          {breadcrumbs.map((b, i) => (
            <li key={b.url} className="flex items-center gap-1">
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

      <article>
        <header>
          <h1 className="text-2xl font-bold">{product.designation_fr}</h1>
          {brandName && (
            <p className="mt-1 text-sm">
              Marque : <a className="text-red-700 underline" href={`/${brandName.toLowerCase().replace(/\s+/g, '-')}`}>{brandName}</a>
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Référence : {sku}</p>
        </header>

        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            width={640}
            height={640}
            alt={buildProductAlt(product as any)}
            className="my-4 h-auto w-full max-w-md rounded border"
          />
        )}

        {/* Price + availability */}
        <section aria-label="Prix et disponibilité" className="my-4">
          <p className="text-xl font-semibold">
            {formatTnd(finalPrice)}
            {hasPromo && oldPrice ? (
              <>
                {' '}
                <s className="text-base font-normal text-gray-500">{formatTnd(oldPrice)}</s>{' '}
                <span className="text-base font-medium text-green-700">En promotion</span>
              </>
            ) : null}
          </p>
          <p className="mt-1">
            Disponibilité :{' '}
            <strong>{inStock ? 'En stock' : 'En rupture de stock'}</strong>
            {inStock ? ' · Livraison 24-72h partout en Tunisie.' : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Livraison gratuite dès 300 DT · Paiement à la livraison · Retour sous 7 jours.
          </p>
        </section>

        {/* Flavours / variants */}
        {aromas.length > 0 && (
          <section aria-label="Saveurs disponibles" className="my-4">
            <h2 className="text-lg font-semibold">Saveurs disponibles</h2>
            <ul className="list-disc pl-5">
              {aromas.map((a) => (
                <li key={a.id}>{a.designation_fr}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Full description — expanded, no "read more" clamp */}
        {descriptionHtml && (
          <section aria-label="Description" className="my-6">
            <h2 className="text-lg font-semibold">Description</h2>
            <div
              className="prose prose-sm mt-2 max-w-none"
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          </section>
        )}

        {/* Nutrition / specs */}
        {nutritionHtml && (
          <section aria-label="Valeurs nutritionnelles" className="my-6">
            <h2 className="text-lg font-semibold">Valeurs nutritionnelles</h2>
            <div
              className="prose prose-sm mt-2 max-w-none"
              dangerouslySetInnerHTML={{ __html: nutritionHtml }}
            />
          </section>
        )}

        {/* Reviews — all published, inline */}
        {reviews.length > 0 && (
          <section aria-label="Avis clients" className="my-6">
            <h2 className="text-lg font-semibold">
              Avis clients {avgRating != null && `— ${avgRating}/5 (${reviews.length})`}
            </h2>
            <ul className="mt-2 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-sm font-medium">
                    {(r.user?.name || 'Client')} — {reviewRating(r)}/5
                    {r.created_at ? ` · ${String(r.created_at).slice(0, 10)}` : ''}
                  </p>
                  {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <section aria-label="Questions fréquentes" className="my-6">
            <h2 className="text-lg font-semibold">Questions fréquentes</h2>
            <dl className="mt-2 space-y-2">
              {faq.map((f, i) => (
                <div key={i}>
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="text-sm text-gray-700">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Internal links: related products (crawl depth + relevance) */}
        {similarProducts.length > 0 && (
          <section aria-label="Produits similaires" className="my-6">
            <h2 className="text-lg font-semibold">Produits similaires</h2>
            <ul className="list-disc pl-5">
              {similarProducts.slice(0, 12).map((p) => (
                <li key={p.id}>
                  <a className="text-red-700 underline" href={getProductLink(p)}>
                    {p.designation_fr}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
