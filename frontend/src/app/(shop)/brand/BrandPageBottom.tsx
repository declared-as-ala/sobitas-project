import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { buildBrandPageCopy } from '@/util/brandTemplate';
import { BrandInStockTable } from './BrandInStockTable';
import { BrandFamilyIndex } from './BrandFamilyIndex';

type BrandPageCopy = ReturnType<typeof buildBrandPageCopy>;

/**
 * Everything a brand page says below its product grid, in one fixed order, for BOTH renders:
 *
 *   a) the in-stock table      — what can be ordered today, format and price
 *   b) the family index        — the brand's ranges, linked to their category pages
 *   c) « À propos de {Marque} » — curated brands only (introHtml)
 *   d) the buying guide
 *   e) « Liens utiles »        — curated category anchors, then « Marques à comparer »
 *   f) the FAQ                 — the exact list the FAQPage JSON-LD is built from
 *
 * Pure function of `copy`: no hooks, no 'use client', no data of its own. The shopper route passes
 * it to ShopPageClient as `categorySeoLandingBottom` and the crawler route as CrawlerCategoryView's
 * `afterGridSlot`, so Googlebot and a shopper read the same sections in the same order — the
 * crawler used to get intro → guide → FAQ and the shopper a different panel entirely.
 *
 * The category chips print `name` exactly as curated. categoryAnchor() would collapse the
 * deliberately varied anchors in brandSeoConfig back to one string per destination — see the
 * « THE CURATED NAME WINS » note in CrawlerCategoryView.
 */

const H2 = 'font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl';
const PROSE =
  'mt-3 max-w-3xl text-sm leading-relaxed text-ink-2 sm:text-base [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-hover [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-3 [&_strong]:text-ink-1 [&_ul]:list-disc [&_ul]:pl-5';
const CHIP =
  'inline-flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export function BrandPageBottom({ copy }: { copy: BrandPageCopy }) {
  const relatedCategories = copy.relatedCategories ?? [];
  const relatedBrands = copy.relatedBrands ?? [];
  const faqs = copy.faqs ?? [];
  const hasLinks = relatedCategories.length > 0 || relatedBrands.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {copy.showInStockTable && <BrandInStockTable title={copy.inStockTitle} products={copy.inStockProducts} />}

      {copy.showFamilyIndex && <BrandFamilyIndex title={copy.familyIndexTitle} families={copy.families} />}

      <div className={faqs.length > 0 ? 'grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]' : undefined}>
        <div className="min-w-0 rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
          {copy.introHtml && (
            <section aria-labelledby="brand-about-heading" className="mb-8">
              <h2 id="brand-about-heading" className={H2}>
                {copy.introTitle}
              </h2>
              <div className={PROSE} dangerouslySetInnerHTML={{ __html: copy.introHtml }} />
            </section>
          )}

          <section aria-labelledby="brand-guide-heading">
            <h2 id="brand-guide-heading" className={H2}>
              {copy.howToChooseTitle}
            </h2>
            <div className={PROSE} dangerouslySetInnerHTML={{ __html: copy.howToChooseBody }} />
          </section>

          {hasLinks && (
            <nav aria-label="Liens utiles" className="mt-6">
              {relatedCategories.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {relatedCategories.map((link) => (
                    <li key={link.url}>
                      <Link href={link.url} prefetch={false} className={CHIP}>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {relatedBrands.length > 0 && (
                <>
                  <h3 className={`${relatedCategories.length > 0 ? 'mt-5 ' : ''}font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-3`}>
                    Marques à comparer
                  </h3>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {relatedBrands.map((b) => (
                      <li key={b.slug}>
                        <Link href={`/${b.slug}`} prefetch={false} className={CHIP}>
                          {b.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </nav>
          )}
        </div>

        {faqs.length > 0 && (
          <section aria-labelledby="brand-faq-heading" className="min-w-0 rounded-2xl border border-hairline bg-sunken p-4 sm:p-6">
            {/* « Questions fréquentes », never « Questions sur {Marque} »: one wording in both
                renders and on every brand (see the history in the removed BrandSeoLanding). */}
            <h2 id="brand-faq-heading" className={H2}>
              Questions fréquentes
            </h2>
            <div className="mt-3 divide-y divide-hairline">
              {faqs.map((faq) => (
                <details key={faq.question} className="group py-1 first:pt-0 last:pb-0">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-2 text-sm font-semibold leading-snug text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
                    <span>{faq.question}</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-3 text-sm leading-relaxed text-ink-2">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
