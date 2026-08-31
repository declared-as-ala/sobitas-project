import { ArrowUpRight, BookOpenCheck, Database, RefreshCw } from 'lucide-react';
import { Section } from '@/app/components/layout/Section';
import { SectionHeader } from '@/app/components/SectionHeader';
import type { PubMedResearchFeed } from '@/services/pubmed';

export function BlogResearchSection({ feed }: { feed: PubMedResearchFeed }) {
  if (feed.studies.length === 0) return null;

  return (
    <Section surface="sunken" spacing="default" width="wide" defer aria-labelledby="research-watch-title">
      <SectionHeader
        id="research-watch-title"
        scale="2"
        kicker="Veille scientifique"
        title="Ce que la recherche étudie"
        subtitle="Une sélection de revues systématiques récentes, directement depuis PubMed."
        trailing={(
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-elevated px-4 text-xs font-semibold text-ink-2">
            {feed.live ? <RefreshCw className="h-3.5 w-3.5 text-brand" aria-hidden="true" /> : <Database className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
            {feed.live ? 'Actualisé chaque jour' : 'Sélection vérifiée'}
          </span>
        )}
        trailingAllWidths
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {feed.studies.map((study, index) => (
          <a
            key={study.id}
            href={study.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[11.75rem] flex-col rounded-2xl border border-rule bg-elevated p-4 transition-colors hover:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <BookOpenCheck className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className="font-display text-xs font-semibold tabular-nums text-ink-3">0{index + 1}</span>
            </div>
            <h3 lang="en" className="mt-4 line-clamp-3 font-display text-[0.9375rem] font-bold leading-[1.4] text-ink-1 group-hover:text-brand sm:text-base">
              {study.title}
            </h3>
            <div className="mt-auto flex items-end justify-between gap-3 border-t border-rule pt-4">
              <p className="min-w-0 text-xs leading-relaxed text-ink-3">
                <span className="line-clamp-1">{study.journal}</span>
                {study.publishedAt && <span className="mt-0.5 block">{study.publishedAt}</span>}
              </p>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </div>
          </a>
        ))}
      </div>

      <p className="mt-4 max-w-4xl border-t border-rule pt-4 text-xs leading-relaxed text-ink-3">
        Veille documentaire en anglais, fournie à titre informatif. Elle ne remplace ni un avis médical ni les recommandations figurant sur l’étiquette d’un produit.{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/About/disclaimer.html"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink-2 underline decoration-rule underline-offset-2 hover:text-brand"
        >
          Politique et avertissement NCBI
        </a>
        .
      </p>
    </Section>
  );
}
