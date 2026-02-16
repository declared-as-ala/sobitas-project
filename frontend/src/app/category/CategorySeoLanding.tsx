import Link from 'next/link';
import type { CategorySeoContent } from '@/types/categorySeo';
import { buildFAQPageSchema, validateStructuredData } from '@/util/structuredData';

export interface RelatedLink {
  slug: string;
  name: string;
  url: string;
}

interface CategorySeoLandingProps {
  /** Page title (H1). Required. */
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
}: CategorySeoLandingProps) {
  const hasIntro = intro && intro.trim().length > 0;
  const hasHowTo = howToChooseTitle && howToChooseBody;
  const hasFaqs = faqs.length > 0;
  const hasRelated = relatedCategories.length > 0;
  const hasBest = bestProducts.length > 0;

  const faqSchema =
    withFaqSchema && hasFaqs
      ? buildFAQPageSchema(faqs.map((f) => ({ id: 0, question: f.question, reponse: f.answer })))
      : null;
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <div className="space-y-8 sm:space-y-10 lg:space-y-12">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

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

      {(hasRelated || hasBest) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          {hasRelated && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Catégories associées
              </h2>
              <ul className="space-y-2">
                {relatedCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={c.url}
                      className="text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasBest && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Produits phares
              </h2>
              <ul className="space-y-2">
                {bestProducts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={p.url}
                      className="text-red-600 dark:text-red-400 hover:underline font-medium"
                    >
                      {p.name}
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
