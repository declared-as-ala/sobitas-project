import Link from 'next/link';
import type { BrandSeoEntry } from '@/config/brandSeoConfig';

export function BrandSeoHeader({ entry }: { entry: BrandSeoEntry }) {
  return (
    <header className="rounded-2xl border border-hairline bg-elevated px-5 py-6 sm:px-7 sm:py-8">
      <p className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
        <span aria-hidden className="h-px w-5 bg-brand" />
        Marque
      </p>
      <h1 className="max-w-4xl font-display font-compressed text-3xl font-extrabold uppercase leading-[0.96] tracking-[-0.02em] text-ink-1 sm:text-4xl lg:text-5xl">
        {entry.h1}
      </h1>
      <div
        className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-2 sm:text-base"
        dangerouslySetInnerHTML={{ __html: entry.introHtml }}
      />
    </header>
  );
}

export function BrandSeoDetails({ entry }: { entry: BrandSeoEntry }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
      <section className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6" aria-labelledby="brand-guide-heading">
        <h2 id="brand-guide-heading" className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl">
          {entry.howToChooseTitle}
        </h2>
        <div
          className="mt-3 text-sm leading-relaxed text-ink-2 sm:text-base"
          dangerouslySetInnerHTML={{ __html: entry.howToChooseBody }}
        />
        <nav aria-label="Comparer les catégories Dymatize" className="mt-5 flex flex-wrap gap-2">
          {entry.relatedCategories.map((link) => (
            <Link
              key={link.slug}
              href={link.url}
              className="inline-flex min-h-11 items-center rounded-full border border-hairline px-4 text-sm font-semibold text-ink-1 transition-colors hover:border-brand hover:text-brand"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </section>

      <section className="rounded-2xl border border-hairline bg-sunken p-4 sm:p-6" aria-labelledby="brand-faq-heading">
        <h2 id="brand-faq-heading" className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl">
          Questions sur Dymatize
        </h2>
        <div className="mt-3 divide-y divide-hairline">
          {entry.faqs.map((faq) => (
            <details key={faq.question} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer list-none pr-6 text-sm font-semibold leading-snug text-ink-1 marker:hidden">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
