import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import Image from 'next/image';
import { Calendar, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { getStorageUrl } from '@/services/api';
import type { Article } from '@/types';

/**
 * "Nos derniers articles" — the last homepage band to be migrated, and it was carrying four
 * separate problems at once. All four are fixed here.
 *
 * 1. COLOUR. It hand-wrote `bg-gray-50 dark:bg-gray-900` — a COOL grey — while every other band
 *    on the page uses the warm sand `--page-sunken` (#F7F6F4). Two greys that are 4 points apart
 *    in hue and 2 in lightness do not read as "two surfaces"; they read as one surface rendered
 *    wrong. It also used `red-600` in five places, which is the DESTRUCTIVE colour, not the brand
 *    orange. That is the "bad distribution of colours" the owner named, in one file.
 *
 * 2. IT PULLED EMBLA INTO THE HOMEPAGE. `'use client'` + `ui/carousel` shipped a carousel engine
 *    to every visitor so that three blog cards could slide. A grid does the same job with no
 *    JavaScript at all. The `'use client'` directive is gone too, though note that this file still
 *    lands in the client graph today because its only importer — HomeDeferredSections — is itself
 *    a client component (it needs `dynamic(ssr:false)` for ScrollToTop). Dropping the directive is
 *    what lets that change later without touching this file; dropping embla is the win now.
 *
 *    Removing the carousel also removed a latent HYDRATION bug. `decodeHtmlEntities` branched on
 *    `typeof window !== 'undefined'` and used a `<textarea>` in the browser but a fixed
 *    replacement table on the server, so any entity outside that table decoded differently on the
 *    two sides. The browser branch is deleted: one deterministic implementation, same output
 *    wherever it runs.
 *
 * 3. CARD PADDING WAS `p-2 sm:p-3` — 8px, against 16-24px everywhere else on the page. It is why
 *    the blog cards looked cramped next to the product cards directly above them.
 *
 * 4. THE CARDS WERE 40% OF THE VIEWPORT EACH (`basis-[40%]`), so on a 1440px screen two and a
 *    half articles were visible and the third was clipped mid-card. Three equal columns.
 */

interface BlogSectionProps {
  articles: Article[];
}

/** Homepage shows three; the rest live at /blog. Matches `lg:grid-cols-3` below. */
const MAX_ARTICLES = 3;

/**
 * Server-side entity decoding. See note 2 above for why the browser branch is gone: this file no
 * longer runs on the client, so a single deterministic implementation is both correct and the
 * only one that can execute.
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&Eacute;/g, 'É')
    .replace(/&egrave;/g, 'è')
    .replace(/&Egrave;/g, 'È')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&Ecirc;/g, 'Ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&Euml;/g, 'Ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&Agrave;/g, 'À')
    .replace(/&acirc;/g, 'â')
    .replace(/&Acirc;/g, 'Â')
    .replace(/&auml;/g, 'ä')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&Ocirc;/g, 'Ô')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&Ugrave;/g, 'Ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&Ucirc;/g, 'Û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&iacute;/g, 'í')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&iuml;/g, 'ï')
    .replace(/&Iuml;/g, 'Ï');
}

export function BlogSection({ articles }: BlogSectionProps) {
  if (!articles || articles.length === 0) return null;

  const displayArticles = articles.slice(0, MAX_ARTICLES);

  return (
    <Section surface="sunken" spacing="tight" width="wide" defer>
      <SectionHeader
        kicker="Le blog"
        title="Nos derniers articles"
        subtitle="Conseils d'experts en nutrition, entraînement et santé pour optimiser vos performances."
        viewAllHref="/blog"
        viewAllLabel="Voir tous les articles"
        /* "2" — a support band. It informs rather than sells, so it sits one step below the four
           product rails and one step above the brand wall. */
        scale="2"
      />

      {/* 1 → 2 → 3. `items-stretch` + `h-full` keep the three cards level when one title wraps. */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {displayArticles.map((article) => {
          // Strip tags before testing for emptiness: a description of "<p>&nbsp;</p>" is truthy
          // as a string but renders as nothing, which would leave a card with a blank grey block.
          const raw = decodeHtmlEntities(article.description_fr || article.description || '');
          const excerpt = raw.replace(/<[^>]*>/g, '').trim() ? raw : '';

          return (
          <li key={article.id} className="min-w-0">
            <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-elevated transition-colors duration-200 hover:border-brand">
              <LinkWithLoading
                href={`/blog/${article.slug}`}
                className="relative block aspect-[16/9] overflow-hidden bg-sunken"
                loadingMessage={`Chargement de ${article.designation_fr}...`}
                /* aria-hidden + tabIndex -1: this is the SECOND link to the same article in the
                   same card. Left focusable it produced two identical tab stops and two identical
                   announcements per card (WCAG 2.4.4). The title link below carries the name. */
                aria-hidden="true"
                tabIndex={-1}
              >
                <Image
                  src={article.cover ? getStorageUrl(article.cover) : '/assets/img/placeholder.webp'}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  /* 3-up from lg inside `max-w-site` (1600) with 32px gutters and 24px gaps:
                     (1600 − 64 − 48)/3 = 496px. 2-up at sm–lg: (vw − 48 − 16)/2 peaks at 48vw. */
                  sizes="(min-width: 1024px) 500px, (min-width: 640px) 48vw, 100vw"
                  loading="lazy"
                />
              </LinkWithLoading>

              {/* 20px all round (24 from sm), against the old 8px. This is what makes the blog
                  cards sit in the same system as the product cards above them. */}
              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {article.created_at
                    ? new Date(article.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        /* Pinned, for the same reason the flash countdown pins it: without a zone
                           the server formats in the container's UTC and the browser in the
                           visitor's, so an article published near midnight renders two dates. */
                        timeZone: 'Africa/Tunis',
                      })
                    : 'Récent'}
                </p>

                <h3 className="mb-2 line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink-1 transition-colors group-hover:text-brand sm:text-base">
                  <LinkWithLoading
                    href={`/blog/${article.slug}`}
                    loadingMessage={`Chargement de ${article.designation_fr}...`}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                  >
                    {decodeHtmlEntities(article.designation_fr || '')}
                  </LinkWithLoading>
                </h3>

                {/* NO FILLER SENTENCE. This used to fall back to "Découvrez cet article
                    intéressant sur la nutrition et le sport." whenever an article had no
                    description — and since `description_fr` is empty for every article currently
                    on the homepage, all three cards printed the SAME sentence. Three identical
                    lines of generic copy is worse than white space: it reads as a template that
                    was never filled in, and it is duplicate content on a page Google crawls.
                    An empty excerpt simply lets `mt-auto` on the link below close the gap. */}
                {excerpt && (
                  <div
                    className="prose prose-neutral prose-sm mb-4 line-clamp-3 max-w-none text-sm leading-relaxed text-ink-2"
                    dangerouslySetInnerHTML={{ __html: excerpt }}
                  />
                )}

                {/* A styled span, NOT a third link to the same article. `mt-auto` pins it to the
                    bottom so three cards of different text lengths still align their footers. */}
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex items-center gap-1.5 font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-brand"
                >
                  Lire la suite
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </article>
          </li>
          );
        })}
      </ul>

      {/* SectionHeader hides its "Voir tout" below sm, so phones get the full-width link here. */}
      <div className="mt-6 sm:hidden">
        <Link
          href="/blog"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-hairline bg-elevated font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors hover:border-brand hover:text-brand"
        >
          Voir tous les articles
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}
