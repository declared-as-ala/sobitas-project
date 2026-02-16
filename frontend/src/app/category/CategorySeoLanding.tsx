import Link from 'next/link';
import type { CategorySeoContent } from '@/types/categorySeo';
import { buildFAQPageSchema, validateStructuredData } from '@/util/structuredData';

export interface RelatedLink {
  slug: string;
  name: string;
  url: string;
}

interface CategorySeoLandingProps {
  /** Page title (H1). Required for top/all. */
  title: string;
  /** Intro HTML or plain text (newlines → paragraphs). Server-rendered. */
  intro: string | null;
  howToChooseTitle: string | null;
  howToChooseBody: string | null;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: RelatedLink[];
  bestProducts: RelatedLink[];
  /** If true, output FAQPage JSON-LD. */
  withFaqSchema?: boolean;
  /** 'top' = H1 + intro + how-to + FAQs only; 'bottom' = Catégories associées + Produits phares only; 'all' = everything (default). */
  section?: 'top' | 'bottom' | 'all';
}

/** Renders plain text as paragraphs (double newline = new paragraph). */
function textToParagraphs(text: string): React.ReactNode {
  if (!text.trim()) return null;
  const blocks = text.split(/\n\n+/).filter((b) => b.trim());
  return blocks.map((p, i) => (
    <p key={i} className="mb-3 sm:mb-4 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed">
      {p.trim().split('\n').map((line, j) => (
        <span key={j}>
          {j > 0 && <br />}
          {line.trim()}
        </span>
      ))}
    </p>
  ));
}

export function CategorySeoLanding({
  title,
  intro,
  howToChooseTitle,
  howToChooseBody,
  faqs,
  relatedCategories,
  bestProducts,
  withFaqSchema = true,
  section = 'all',
}: CategorySeoLandingProps) {
  const hasIntro = intro && intro.trim().length > 0;
  const hasHowTo = howToChooseTitle && howToChooseBody;
  const hasFaqs = faqs.length > 0;
  const hasRelated = relatedCategories.length > 0;
  const hasBest = bestProducts.length > 0;

  const faqSchema =
    withFaqSchema && hasFaqs && (section === 'top' || section === 'all')
      ? buildFAQPageSchema(faqs.map((f) => ({ id: 0, question: f.question, reponse: f.answer })))
      : null;
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  const showTop = section === 'top' || section === 'all';
  const showBottom = section === 'bottom' || section === 'all';

  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {showTop && (
        <>
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h1>
      </header>

      {hasIntro && (
        <section className="prose prose-gray dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed">
          <div className="text-base sm:text-lg">
            {intro.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: intro }} />
            ) : (
              textToParagraphs(intro)
            )}
          </div>
        </section>
      )}

      {hasHowTo && (
        <section className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4 sm:p-6 lg:p-8">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
            {howToChooseTitle}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
            {howToChooseBody.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: howToChooseBody }} />
            ) : (
              textToParagraphs(howToChooseBody)
            )}
          </div>
        </section>
      )}

      {hasFaqs && (
        <section className="border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
          <h2 className="sr-only">Questions fréquentes</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {faqs.map((faq, i) => (
              <li key={i}>
                <details className="group">
                  <summary className="list-none flex items-center justify-between gap-2 py-4 px-4 sm:px-6 cursor-pointer text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <span>{faq.question}</span>
                    <span className="shrink-0 text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>
                      ▼
                    </span>
                  </summary>
                  <div className="pb-4 px-4 sm:px-6 pt-0 text-gray-600 dark:text-gray-400 text-sm sm:text-base leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
        </>
      )}

      {showBottom && (hasRelated || hasBest) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
          {hasRelated && (
            <div className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Catégories associées
              </h2>
              <ul className="space-y-2 sm:space-y-2.5">
                {relatedCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={c.url}
                      className="inline-flex items-center font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:underline transition-colors"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasBest && (
            <div className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                Produits phares
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-1 gap-2 sm:gap-2.5">
                {bestProducts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={p.url}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/50 transition-colors group"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                        →
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2">
                        {p.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
