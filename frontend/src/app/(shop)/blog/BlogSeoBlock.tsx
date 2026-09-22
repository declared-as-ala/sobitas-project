import Link from 'next/link';
import { getBlogSeoEntry } from '@/config/blogSeoConfig';
import { buildFAQPageSchemaFromQA } from '@/util/structuredData';

interface BlogSeoBlockProps {
  slug: string;
}

/**
 * Reusable SEO block for blog articles: FAQ section + internal links with keyword anchors.
 * Renders only when slug exists in blogSeoConfig. Outputs FAQPage schema when FAQs present.
 */
export function BlogSeoBlock({ slug }: BlogSeoBlockProps) {
  const entry = getBlogSeoEntry(slug);
  if (!entry) return null;

  const { faqs } = entry;
  /*
   * One chip per destination. Thirteen entries listed the same anchor+href two to four times, so
   * the block rendered "créatine monohydrate en Tunisie → /creatine" twice in a row: no extra
   * signal (Google weighs the first anchor to a URL on a page), and a repeated exact-match phrase
   * is what a generated keyword strip looks like. The first occurrence wins, so the editorial
   * order of each entry is preserved.
   */
  const internalLinks = entry.internalLinks.filter(
    (link, i, all) => all.findIndex((other) => other.href === link.href) === i
  );
  const hasFaqs = faqs.length > 0;
  const hasLinks = internalLinks.length > 0;
  if (!hasFaqs && !hasLinks) return null;

  const faqSchema = hasFaqs ? buildFAQPageSchemaFromQA(faqs) : null;

  return (
    <div
      className="mt-8 space-y-8 border-t border-gray-200 pt-8 dark:border-gray-800 sm:mt-10"
      lang={entry.lang}
      dir={entry.lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {hasFaqs && (
        <section aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {entry.faqHeading || 'Questions fréquentes'}
          </h2>
          <ul className="space-y-4">
            {faqs.map((faq, i) => (
              <li key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{faq.question}</h3>
                <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">{faq.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasLinks && (
        <section aria-labelledby="read-also-heading">
          <h2 id="read-also-heading" className="font-display uppercase tracking-tight text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {entry.linksHeading || 'Lire aussi'}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {internalLinks.map((link, i) => (
              <li key={i}>
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  {link.anchor}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
