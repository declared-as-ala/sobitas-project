import Link from 'next/link';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import Image from 'next/image';
import { Calendar, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/app/components/SectionHeader';
import { Section } from '@/app/components/layout/Section';
import { getStorageUrl } from '@/services/api';
import type { Article } from '@/types';

/** Editorial cards: compact reading list on phones, three illustrated columns on desktop.
 * Real covers only. Missing artwork must not reserve a large empty image panel. */

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
    // Measured content boxes (padding + seam excluded): 540 / 512 / 718 / 406px
    // at 320 / 390 / 768 / 1440. Desktop band height is 455px, not the reservation.
    <Section spacing="tight" width="wide" defer className="[&.pt-defer]:[contain-intrinsic-size:auto_512px] max-[359px]:[&.pt-defer]:[contain-intrinsic-size:auto_540px] sm:[&.pt-defer]:[contain-intrinsic-size:auto_718px] lg:[&.pt-defer]:[contain-intrinsic-size:auto_406px]">
      {/* Subtitle removed. "Conseils d'experts en nutrition, entraînement et santé pour optimiser
          vos performances" is a description of a blog, and the reader is looking at three article
          titles that describe themselves. It cost a line of body copy plus its margin at the top
          of every homepage scroll and told nobody anything. */}
      <SectionHeader
        kicker="Le blog"
        title="Nos derniers articles"
        viewAllHref="/blog"
        viewAllLabel="Voir tous les articles"
        /* "2" — a support band. It informs rather than sells, so it sits one step below the four
           product rails and one step above the brand wall. */
        scale="2"
      />

      {/* 1 → 2 → 3. `items-stretch` + `h-full` keep the three cards level when one title wraps. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {displayArticles.map((article) => {
          // Strip tags before testing for emptiness: a description of "<p>&nbsp;</p>" is truthy
          // as a string but renders as nothing, which would leave a card with a blank grey block.
          const raw = decodeHtmlEntities(article.description_fr || article.description || '');
          const excerpt = raw.replace(/<[^>]*>/g, '').trim() ? raw : '';

          return (
          <li key={article.id} className="min-w-0">
            <article className="group relative flex h-full min-w-0 overflow-hidden rounded-xl border border-hairline bg-elevated transition-colors hover:border-brand/40 sm:flex-col">
              {article.cover && (
              <LinkWithLoading
                href={`/blog/${article.slug}`}
                className="relative ml-3 mt-3 block aspect-[4/3] w-20 shrink-0 self-start overflow-hidden rounded-lg bg-sunken sm:m-0 sm:h-44 sm:w-full sm:rounded-none"
                loadingMessage={`Chargement de ${article.designation_fr}...`}
                /* aria-hidden + tabIndex -1: this is the SECOND link to the same article in the
                   same card. Left focusable it produced two identical tab stops and two identical
                   announcements per card (WCAG 2.4.4). The title link below carries the name. */
                aria-hidden="true"
                tabIndex={-1}
              >
                <Image
                  src={getStorageUrl(article.cover)}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  /* Fixed 80px thumbnails on phones; full card width from sm. */
                  sizes="(min-width: 1024px) 500px, (min-width: 640px) 48vw, 80px"
                  loading="lazy"
                />
              </LinkWithLoading>
              )}

              <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
                <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium leading-4 text-ink-3">
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

                <h3 className="mb-2 font-sans text-sm font-semibold leading-5 text-ink-1 transition-colors group-hover:text-brand sm:text-base sm:leading-6">
                  <LinkWithLoading
                    href={`/blog/${article.slug}`}
                    loadingMessage={`Chargement de ${article.designation_fr}...`}
                    className="line-clamp-2 min-h-11 after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-focus"
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
                    className="prose prose-neutral prose-sm mb-4 hidden max-w-none text-sm leading-6 text-ink-2 sm:line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: excerpt }}
                  />
                )}

                {/* A styled span, NOT a third link to the same article. `mt-auto` pins it to the
                    bottom so three cards of different text lengths still align their footers. */}
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold leading-4 text-brand"
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
      <div className="mt-4 sm:hidden">
        <Link
          href="/blog"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-hairline bg-elevated font-display font-extended text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-1 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Voir tous les articles
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  );
}
