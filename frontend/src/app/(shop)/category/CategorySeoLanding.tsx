import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Wallet,
} from 'lucide-react';
import { buildFAQPageSchemaFromQA, validateStructuredData } from '@/util/structuredData';
import { htmlToText } from '@/util/sanitizeProductHtml';

export interface RelatedLink {
  slug: string;
  name: string;
  url: string;
}

interface CategorySeoLandingProps {
  title: string;
  /** Canonical taxonomy slug; used to select the approved lightweight category artwork. */
  slug?: string;
  /** Admin banner remains a fallback for categories without approved local art. */
  banners?: { desktop?: string; mobile?: string };
  intro: string | null;
  longBottomHtml?: string | null;
  howToChooseTitle: string | null;
  howToChooseBody: string | null;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: RelatedLink[];
  bestProducts: RelatedLink[];
  withFaqSchema?: boolean;
  section?: 'header' | 'below-fold' | 'top' | 'bottom' | 'all';
}

const CATEGORY_ART: Record<string, string> = {
  proteines: '/media/category-art/proteines.png',
  'sante-vitalite': '/media/category-art/sante-vitalite.png',
  'perte-de-poids': '/media/category-art/perte-de-poids.png',
  performance: '/media/category-art/performance.png',
  equipement: '/media/category-art/equipement.png',
  'prise-de-masse': '/media/category-art/prise-de-masse.png',
};

const TRUST_FACTS = [
  { icon: ShieldCheck, label: 'Produits authentiques' },
  { icon: Truck, label: 'Livraison 24–72 h' },
  { icon: Wallet, label: 'Paiement à la livraison' },
];

function renderContent(value: string): ReactNode {
  if (value.includes('<')) return <div dangerouslySetInnerHTML={{ __html: value }} />;

  return value
    .split(/\n\n+/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph, index) => <p key={index}>{paragraph.trim()}</p>);
}

export function CategorySeoLanding({
  title,
  slug,
  banners,
  intro,
  longBottomHtml,
  howToChooseTitle,
  howToChooseBody,
  faqs,
  relatedCategories,
  bestProducts,
  withFaqSchema = true,
  section = 'all',
}: CategorySeoLandingProps) {
  const hasIntro = Boolean(intro?.trim());
  const hasLongBottom = Boolean(longBottomHtml?.trim());
  const hasHowTo = Boolean(howToChooseTitle?.trim() && howToChooseBody?.trim());
  const hasFaqs = faqs.length > 0;
  const showHeader = section === 'header' || section === 'top' || section === 'all';
  const showDetails = section === 'below-fold' || section === 'top' || section === 'all';
  const showLinks = section === 'below-fold' || section === 'bottom' || section === 'all';
  const localArt = slug ? CATEGORY_ART[slug] : undefined;
  const desktopArt = localArt || banners?.desktop?.trim() || banners?.mobile?.trim();
  const mobileArt = localArt || banners?.mobile?.trim() || banners?.desktop?.trim();
  const faqSchema = withFaqSchema && hasFaqs && showDetails ? buildFAQPageSchemaFromQA(faqs) : null;

  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  return (
    <div className="space-y-6 lg:space-y-8">
      {faqSchema ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      ) : null}

      {showHeader ? (
        <header className="overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-card">
          <div className="grid min-h-[250px] grid-cols-1 lg:grid-cols-5">
            <div className="flex min-w-0 flex-col justify-center px-4 py-6 sm:p-8 lg:col-span-3 lg:p-10">
              <p className="mb-3 flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                <span className="h-px w-5 bg-brand" aria-hidden="true" />
                Sélection Protein.tn
              </p>
              <h1 className="max-w-[20ch] font-display font-compressed text-[2.15rem] font-extrabold uppercase leading-[0.92] tracking-[-0.025em] text-ink-1 sm:text-[2.75rem] lg:text-[3.25rem]">
                {title}
              </h1>
              {hasIntro ? (
                <p className="mt-4 line-clamp-3 max-w-[68ch] text-sm leading-relaxed text-ink-2 sm:text-[15px]">
                  {htmlToText(intro!, 520)}
                </p>
              ) : null}

              <ul className="mt-6 grid gap-2 border-t border-rule pt-4 sm:grid-cols-3">
                {TRUST_FACTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex min-h-8 items-center gap-2 text-[12px] font-semibold text-ink-2">
                    <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {desktopArt ? (
              <div className="relative min-h-[180px] overflow-hidden bg-ink-1 sm:min-h-[220px] lg:col-span-2 lg:min-h-[250px]">
                <picture className="contents">
                  {mobileArt ? <source media="(max-width: 767px)" srcSet={mobileArt} /> : null}
                  <Image
                    src={desktopArt}
                    alt={`Sélection ${title}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 767px) 100vw, 38vw"
                    priority={Boolean(localArt)}
                  />
                </picture>
              </div>
            ) : null}
          </div>
        </header>
      ) : null}

      {showDetails && (hasIntro || hasHowTo || hasLongBottom) ? (
        <section aria-labelledby="category-guide-title" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6 lg:p-8">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/[0.08] text-brand">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Conseil d’achat</p>
              <h2 id="category-guide-title" className="mt-1 font-display font-compressed text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl">
                {howToChooseTitle?.trim() || `Bien choisir ${title.toLocaleLowerCase('fr')}`}
              </h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <div className="prose prose-neutral max-w-none text-sm leading-relaxed text-ink-2 prose-headings:font-display prose-headings:text-ink-1 prose-a:text-brand sm:text-[15px]">
              {hasHowTo ? renderContent(howToChooseBody!) : hasIntro ? renderContent(intro!) : null}
            </div>
            <aside className="rounded-xl bg-sunken p-4 sm:p-5" aria-label="Pourquoi commander chez Protein.tn">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">L’essentiel</p>
              <ul className="mt-3 space-y-3">
                {[
                  'Vérifiez votre objectif et la portion conseillée.',
                  'Comparez le prix, le format et la disponibilité.',
                  'Besoin d’aide ? Notre équipe vous conseille.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {hasLongBottom ? (
            <details className="group mt-6 border-t border-rule pt-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-1">
                <span>Lire le guide complet</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <article
                className="prose prose-neutral mt-4 max-w-none text-sm leading-relaxed text-ink-2 prose-headings:font-display prose-headings:text-ink-1 prose-a:text-brand sm:text-[15px]"
                dangerouslySetInnerHTML={{ __html: longBottomHtml! }}
              />
            </details>
          ) : null}
        </section>
      ) : null}

      {showDetails && hasFaqs ? (
        <section aria-labelledby="category-faq-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">Réponses rapides</p>
              <h2 id="category-faq-title" className="mt-1 font-display font-compressed text-2xl font-extrabold uppercase leading-none text-ink-1 sm:text-3xl">
                Questions fréquentes
              </h2>
            </div>
            <span className="hidden text-sm text-ink-3 sm:inline">{faqs.length} réponses</span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-hairline bg-elevated divide-y divide-rule">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="group">
                <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold text-ink-1 sm:px-6">
                  <span className="flex items-start gap-3 text-sm sm:text-[15px]">
                    <span className="mt-0.5 text-xs tabular-nums text-brand">{String(index + 1).padStart(2, '0')}</span>
                    {faq.question}
                  </span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="border-t border-rule bg-sunken px-4 py-4 ps-11 text-sm leading-relaxed text-ink-2 sm:px-6 sm:ps-[3.75rem] sm:text-[15px]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      {showLinks && (relatedCategories.length > 0 || bestProducts.length > 0) ? (
        <section className="grid gap-4 md:grid-cols-2">
          <LinkList title="Rayons associés" icon={<Sparkles className="h-4 w-4" aria-hidden="true" />} links={relatedCategories} />
          <LinkList title="Produits à découvrir" icon={<Star className="h-4 w-4" aria-hidden="true" />} links={bestProducts} />
        </section>
      ) : null}
    </div>
  );
}

function LinkList({ title, icon, links }: { title: string; icon: ReactNode; links: RelatedLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-5">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-ink-1">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      <ul className="mt-3 divide-y divide-rule">
        {links.slice(0, 6).map((item) => (
          <li key={item.slug}>
            <Link href={item.url} className="group flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-ink-2 transition-colors hover:text-brand">
              <span className="line-clamp-1">{item.name}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
