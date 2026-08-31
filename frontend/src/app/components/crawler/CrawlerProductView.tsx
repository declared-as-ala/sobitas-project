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
import { formatTnd, getPriceDisplay } from '@/util/productPrice';
import { isInStock } from '@/util/cartStock';
import { sanitizeRichHtml } from '@/util/sanitizeRichHtml';
import { getProductBreadcrumbs, getProductLink, getProductPrimarySubCategory } from '@/util/productUrl';
import { buildComparison } from '@/util/productComparison';
import { thumbnailUrl, videoId, videoTitle, watchUrl } from '@/util/officialVideo';
import { buildProductAlt } from '@/util/productAlt';
import { generateProductFallbackDescription } from '@/util/productDescriptionFallback';
import {
  productSourceAttribution,
  productSourceFactRows,
  productSourceGallery,
  productSourceNutritionHtml,
  productSourceSections,
} from '@/util/productSourceFacts';
import type { Product } from '@/types';

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
  /*
   * The fallback is the point of parity.
   *
   * ProductDetailClient falls back to generateProductFallbackDescription when both description
   * columns are empty; this view did not. A product in that state therefore showed a human real
   * copy and showed Googlebot — which is rewritten here by middleware — no Description section at
   * all. Measured today that affects no live product, so this is closing a trapdoor rather than
   * fixing a visible bug: the enrichment pipeline creates products, and the first one it creates
   * without a description would have fallen straight through it.
   */
  const descriptionHtml = sanitizeRichHtml(
    product.description_fr || product.description_cover || generateProductFallbackDescription(product)
  );
  const nutritionHtml = sanitizeRichHtml(product.nutrition_values || '');
  const nutritionImages = (
    Array.isArray(product.nutrition_images) ? product.nutrition_images : []
  ).filter(Boolean);
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
  const comparison = buildComparison(product, similarProducts);
  const subCategoryName = getProductPrimarySubCategory(product)?.designation_fr ?? '';
  const officialVideoId = videoId(product.official_video);
  /*
   * Transcribed specifications — the same rows, from the same function, as the human page.
   *
   * Empty for every one of the 309 hand-made products (they carry no source_facts), so the section
   * below does not render for them and this file's output for those products is unchanged.
   */
  const sourceFacts = productSourceFactRows(product);
  /*
   * The transcribed product page: the manufacturer's suggested use, ingredient list and warnings,
   * the Supplement Facts panel, the photo gallery, and one sentence about where the words came from.
   *
   * The manufacturer's OVERVIEW is not here — promotion folded it into `description_fr`, so it
   * arrives through `descriptionHtml` above and is rendered by the Description section, on this
   * route and on the human one alike. Rendering it here as well would print the same paragraph
   * twice on the only page Googlebot sees.
   *
   * All four are empty for every one of the 309 hand-made products, so every block below is absent
   * from their markup exactly as it was before this content existed.
   */
  const sourceSections = productSourceSections(product);
  const sourceNutritionHtml = sanitizeRichHtml(productSourceNutritionHtml(product) || '');
  const sourceGallery = productSourceGallery(product);
  const sourceAttribution = productSourceAttribution(product);

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

        {/*
          Transcribed specifications.

          For an imported product this is the only structured fact on the page besides the price:
          the format printed on the packaging, and the flavour variant. Both come from the source
          product name via IHerbNormalizer, which transcribes and never converts, and both are
          rendered here in the same words and the same order as on the human page — the parity
          requirement that makes this route a projection rather than a second, different page.

          Nothing renders when the list is empty, which is the permanent state of all 309 hand-made
          products.
        */}
        {sourceFacts.length > 0 && (
          <section aria-label="Caractéristiques" className="my-6">
            <h2 className="text-lg font-semibold">Caractéristiques</h2>
            <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              {sourceFacts.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="font-medium">{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
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

        {/*
          The transcribed prose blocks — suggested use, other ingredients, warnings.

          Straight after the description because that is where they sit on the source page and where
          the human route prints them: the description tab, under the description. Each block's
          heading is ours (ImportedSourceContent::SECTION_HEADINGS) and each block's CONTENT is the
          manufacturer's, transcribed verbatim and sanitised — never rewritten, never summarised.

          The warnings block in particular is a safety text a customer acts on. It is rendered whole,
          in the same words, on both routes; it is not truncated and it is not moved below the fold,
          because there is no fold on this route and there must be no version of this page where it
          says less.
        */}
        {sourceSections.length > 0 &&
          sourceSections.map((section) => {
            const html = sanitizeRichHtml(section.html);
            if (!html) return null;
            return (
              <section key={section.key} aria-label={section.heading} className="my-6">
                <h2 className="text-lg font-semibold">{section.heading}</h2>
                <div
                  className="prose prose-sm mt-2 max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </section>
            );
          })}

        {/* Nutrition / specs */}
        {(nutritionHtml || sourceNutritionHtml || nutritionImages.length > 0) && (
          <section aria-label="Valeurs nutritionnelles" className="my-6">
            <h2 className="text-lg font-semibold">Valeurs nutritionnelles</h2>
            {nutritionHtml && (
              <div
                className="prose prose-sm mt-2 max-w-none"
                dangerouslySetInnerHTML={{ __html: nutritionHtml }}
              />
            )}
            {/*
              The Supplement Facts panel transcribed from the source page, as the table it is.

              It sits AFTER `nutrition_values`, which is the column an admin fills in by hand from
              the physical label of the lot we hold. When both exist the hand-read one leads, because
              it is evidence about the product in our warehouse and this one is a transcription of a
              retailer's rendering of the manufacturer's panel. In practice they never both exist:
              promotion writes no `nutrition_values`, and no legacy product has a staging row.
            */}
            {sourceNutritionHtml && (
              <div
                className="prose prose-sm mt-2 max-w-none overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: sourceNutritionHtml }}
              />
            )}
            {/*
              Photographs of the printed Supplement Facts panel.

              These render on the human page but were absent here, so Googlebot — which gets this
              view — saw no nutrition content at all for any product whose panel is a photo. For a
              catalogue of EU brands that publish no machine-readable panel anywhere, a picture of
              the label is often the ONLY evidence that exists, which makes this the difference
              between a sourced page and an empty section.

              The alt text names the product and says what the image is, because that text is the
              only part a crawler can read.
            */}
            {nutritionImages.length > 0 && (
              <ul className="mt-3 space-y-3">
                {nutritionImages.map((path, i) => (
                  <li key={path}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getStorageUrl(path)}
                      width={600}
                      height={400}
                      loading="lazy"
                      alt={`${product.designation_fr ?? 'Produit'} — valeurs nutritionnelles${
                        nutritionImages.length > 1 ? ` (${i + 1}/${nutritionImages.length})` : ''
                      }`}
                      className="h-auto w-full max-w-lg rounded border"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/*
          The product photographs the source page listed.

          Migration 2026_08_10_000008 and CatalogIHerbPromote::coverUrl() both record that a gallery
          was impossible against the JSON payload — a primary index and no count means probing 1..n
          and storing URLs that 404. The PAGE lists them outright, so these are enumerated, not
          guessed; the API drops the source's CMS banners and normalises each URL to the same size
          variant the cover already uses.

          Plain <img> rather than next/image, like every other image on this route: this view ships
          no JavaScript on purpose. The alt text names the product and says which photograph it is,
          because that text is the only part a crawler can read — and Google Images is where a
          catalogue of product photography actually earns something.

          Absent for all 309 legacy products, which carry no gallery on this route today either.
        */}
        {sourceGallery.length > 0 && (
          <section aria-label="Photos du produit" className="my-6">
            <h2 className="text-lg font-semibold">Photos du produit</h2>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {sourceGallery.map((url, i) => (
                <li key={url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    width={300}
                    height={300}
                    loading="lazy"
                    alt={`${product.designation_fr ?? 'Produit'} — photo ${i + 1}/${sourceGallery.length}`}
                    className="h-auto w-full rounded border"
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          Where the words above came from, said on the page.

          One sentence, composed server-side so this route and the human route cannot word it
          differently: the text is transcribed from the manufacturer's own listing, the French may be
          a machine translation (iHerb declares it on every non-English page, and the transcribed
          sentences include suggested use and contraindications), and the label printed on the
          packaging is what governs.

          Null for every product with no transcribed content, which is all 309 legacy products.
        */}
        {sourceAttribution && (
          <p className="my-6 text-xs text-gray-600">{sourceAttribution}</p>
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

        {/*
          Official brand video.

          Rendered as a real embed on the human page and as a thumbnail + link here. That is not a
          parity gap: a bot gains nothing from an iframe, and the VideoObject schema on the page
          carries the same embedUrl, thumbnail and title either way. What matters is that both
          audiences are told the same video exists and can reach it.
        */}
        {officialVideoId && (
          <section aria-label="Vidéo officielle" className="my-6">
            <h2 className="text-lg font-semibold">Vidéo officielle</h2>
            <p className="mt-1 text-sm">
              <a
                className="text-red-700 underline"
                href={watchUrl(officialVideoId)}
                rel="noopener nofollow"
                target="_blank"
              >
                {videoTitle(product.official_video, product.designation_fr ?? '')}
              </a>
              {product.official_video?.channel ? ` — chaîne ${product.official_video.channel}` : ''}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl(officialVideoId)}
              width={480}
              height={360}
              loading="lazy"
              alt={videoTitle(product.official_video, product.designation_fr ?? '')}
              className="mt-2 h-auto w-full max-w-sm rounded border"
            />
          </section>
        )}

        {/*
          Comparison table.

          Replaces a bullet list of sibling names that helped crawl depth and helped a shopper not
          at all. Every column comes from data we already own, so this works on all 309 products
          today — no barcode, no external source. Deliberately no price-per-kilo column: see
          util/productComparison.ts for why that number would be a thousandfold lie on at least one
          product in this catalogue.
        */}
        {comparison.length > 0 && (
          <section aria-label="Comparatif" className="my-6">
            <h2 className="text-lg font-semibold">Comparer avec des produits similaires</h2>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                {/* The caption used to name the CURRENT product's subcategory and claim the rows
                    below were "autres {that category}". They frequently are not: a live Googlebot
                    fetch showed "Autres barres & snacks protéinés" printed above four whey
                    proteins. It was a false statement served to a crawler on ~6,133 pages, and it
                    was avoidable — each row's own category is now a COLUMN, so the table shows the
                    truth per row instead of asserting a wrong one over all of them. */}
                <caption className="pb-2 text-left text-gray-600">
                  Produits similaires disponibles chez Protein.tn
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="border-b-2 p-2 text-left">Produit</th>
                    <th scope="col" className="border-b-2 p-2 text-left">Marque</th>
                    <th scope="col" className="border-b-2 p-2 text-left">Catégorie</th>
                    <th scope="col" className="border-b-2 p-2 text-left">Format</th>
                    <th scope="col" className="border-b-2 p-2 text-left">Prix</th>
                    <th scope="col" className="border-b-2 p-2 text-left">Disponibilité</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.id}>
                      <th scope="row" className="border-b p-2 text-left font-normal">
                        {row.isCurrent ? (
                          <span aria-current="true"><strong>{row.name}</strong> (cette page)</span>
                        ) : (
                          <a className="text-red-700 underline" href={row.url}>{row.name}</a>
                        )}
                      </th>
                      <td className="border-b p-2">{row.brand || '—'}</td>
                      {/* Linked: 4-6 extra internal links to category pages from every product
                          page, on the crawler route, which is the surface that gets read. */}
                      <td className="border-b p-2">
                        {row.category
                          ? row.categoryUrl
                            ? <a className="underline" href={row.categoryUrl}>{row.category}</a>
                            : row.category
                          : '—'}
                      </td>
                      <td className="border-b p-2">{row.format || '—'}</td>
                      <td className="border-b p-2">
                        {formatTnd(row.price)}
                        {/* "promo" alone never said promo FROM WHAT. The saving is the number the
                            reader came to this table for. */}
                        {row.oldPrice != null ? ` au lieu de ${formatTnd(row.oldPrice)}` : row.hasPromo ? ' (promo)' : ''}
                      </td>
                      <td className="border-b p-2">{row.inStock ? 'En stock' : 'En rupture'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Internal links: the full sibling set, for crawl depth beyond the compared few. */}
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
