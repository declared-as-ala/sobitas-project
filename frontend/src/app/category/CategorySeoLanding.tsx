'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Truck,
  Wallet, 
  ShieldCheck, 
  Tag, 
  Headphones, 
  Sparkles, 
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Bookmark,
  Zap,
  Flame,
  Activity,
  HeartHandshake,
  Star
} from 'lucide-react';
import { buildFAQPageSchemaFromQA, validateStructuredData } from '@/util/structuredData';
import { CategorySeoLandingExpandable } from '@/app/category/CategorySeoLandingExpandable';

export interface RelatedLink {
  slug: string;
  name: string;
  url: string;
}

interface CategorySeoLandingProps {
  /** Page title (H1). Required for top/all. */
  title: string;
  /** Optional SEO hero banners from API (absolute URLs). */
  banners?: { desktop?: string; mobile?: string };
  /** Intro HTML or plain text (newlines → paragraphs). Server-rendered. */
  intro: string | null;
  /** Long-form bottom SEO HTML from API (distinct from JSON “how-to”). */
  longBottomHtml?: string | null;
  howToChooseTitle: string | null;
  howToChooseBody: string | null;
  faqs: Array<{ question: string; answer: string }>;
  relatedCategories: RelatedLink[];
  bestProducts: RelatedLink[];
  /** If true, output FAQPage JSON-LD. */
  withFaqSchema?: boolean;
  /** 'header' = trust row + H1 only (products above the fold); 'below-fold' = intro + how-to + FAQ + related + best (no H1); 'top' = H1 + intro + how-to + FAQs; 'bottom' = Catégories + Produits phares; 'all' = everything. */
  section?: 'header' | 'below-fold' | 'top' | 'bottom' | 'all';
}

const TRUST_BADGES = [
  { icon: Truck, title: "Livraison Rapide", desc: "24-72h partout en Tunisie" },
  { icon: Wallet, title: "Paiement Cash", desc: "Payez à la livraison" },
  { icon: ShieldCheck, title: "100% Original", desc: "Produits authentiques" },
  { icon: Tag, title: "Meilleurs Prix", desc: "Tarifs & packs exclusifs" },
  { icon: Headphones, title: "Support Client", desc: "Conseils d'experts sportifs" },
];

const CREATINE_BENEFITS = [
  {
    icon: Flame,
    title: "Force Explosive & ATP",
    desc: "Sature vos réserves musculaires en phosphocréatine pour resynthétiser l'ATP instantanément lors des séries intenses."
  },
  {
    icon: Activity,
    title: "Volume & Hydratation",
    desc: "Favorise la volumisation cellulaire par rétention d'eau intramusculaire pour un aspect plein et dense."
  },
  {
    icon: Zap,
    title: "Récupération Accélérée",
    desc: "Diminue la fatigue musculaire entre les séries lourdes et favorise une régénération musculaire rapide."
  },
];

const GENERIC_BENEFITS = [
  {
    icon: ShieldCheck,
    title: "100% Authentique",
    desc: "Produits importés officiellement, qualité certifiée et testée en laboratoire.",
  },
  {
    icon: Truck,
    title: "Livraison Express",
    desc: "Expédition rapide, livraison 24-72h dans toute la Tunisie.",
  },
  {
    icon: HeartHandshake,
    title: "Conseils Experts",
    desc: "Notre équipe de coachs sportifs vous guide dans vos choix.",
  },
];

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

function plainTextFromContent(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function CategorySeoLanding({
  title,
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
  const heroDesktop = banners?.desktop?.trim();
  const heroMobile = banners?.mobile?.trim();
  const heroSrc = heroDesktop || heroMobile;
  const hasIntro = intro && intro.trim().length > 0;
  const hasLongBottom = Boolean(longBottomHtml && longBottomHtml.trim().length > 0);
  const hasHowTo = howToChooseTitle && howToChooseBody;
  const hasFaqs = faqs.length > 0;
  const hasRelated = relatedCategories.length > 0;
  const hasBest = bestProducts.length > 0;

  const faqSchema =
    withFaqSchema && hasFaqs && (section === 'top' || section === 'all' || section === 'below-fold')
      ? buildFAQPageSchemaFromQA(faqs)
      : null;
  if (faqSchema) validateStructuredData(faqSchema, 'FAQPage');

  const showHeader = section === 'header' || section === 'top' || section === 'all';
  const showTop = section === 'top' || section === 'all';
  const showContentBelowFold = section === 'below-fold';
  const showBottom = section === 'bottom' || section === 'all' || section === 'below-fold';
  const headerIntro = section === 'header' && hasIntro ? plainTextFromContent(intro) : '';

  const isCreatine = title.toLowerCase().includes('créatine') || title.toLowerCase().includes('creatine');

  return (
    <div className="space-y-6 sm:space-y-8 lg:space-y-12">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* Header section */}
      {showHeader && (
        <div className="space-y-6">
          {heroSrc && (
            <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 mb-4 sm:mb-6 aspect-[21/9] max-h-[260px] sm:max-h-[320px] shadow-sm">
              <picture className="contents">
                {heroMobile ? (
                  <source media="(max-width: 767px)" srcSet={heroMobile} />
                ) : null}
                <Image
                  src={heroDesktop || heroMobile!}
                  alt={title ? `Bannière — ${title}` : 'Bannière catégorie'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, min(1400px, 100vw)"
                  priority
                />
              </picture>
            </div>
          )}

          {/* Premium Trust Badges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 sm:gap-4 my-2">
            {TRUST_BADGES.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-300 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {badge.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5 leading-none">
                      {badge.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CREATINE HERO */}
          {isCreatine ? (
            <div className="p-6 sm:p-8 md:p-10 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 min-w-0 text-center lg:text-left">
                  {/* Kicker */}
                  <span className="inline-flex items-center gap-2 mb-4 sm:mb-5 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400 justify-center lg:justify-start">
                    <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
                    Force &amp; Volume Maximum
                  </span>

                  <h1 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-gray-900 dark:text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
                    Créatine <span className="text-red-600 dark:text-red-400">Tunisie</span>
                  </h1>

                  <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    Vous souhaitez franchir un palier et augmenter votre force de manière explosive ? Sur <strong>Protein.tn</strong>, découvrez les meilleures formules de <strong>créatine monohydrate</strong>, micronisée et labellisée Creapure® aux meilleurs prix en Tunisie. Importation 100% officielle avec livraison express chez vous.
                  </p>

                  {/* Horizontal mini-guide tags */}
                  <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 font-medium">Monohydrate</span>
                    <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 font-medium">Creapure®</span>
                    <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 font-medium">Micronisée</span>
                    <span className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-300 font-medium">Capsules</span>
                  </div>
                </div>

                {/* Creatine benefits grid inside hero */}
                <div className="w-full lg:w-[350px] shrink-0 space-y-3">
                  {CREATINE_BENEFITS.map((benefit, i) => {
                    const BIcon = benefit.icon;
                    return (
                      <div
                        key={i}
                        className="flex gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-300 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                          <BIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {benefit.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                            {benefit.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Generic category hero — flat, one-accent */
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 sm:p-8 md:p-10">
              <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-10">

                {/* ── Left column: kicker + H1 + clamped intro ── */}
                <div className="flex-1 min-w-0">

                  {/* Kicker */}
                  <span className="inline-flex items-center gap-2 mb-5 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-red-600 dark:text-red-400">
                    <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
                    Qualité Premium
                  </span>

                  {/* H1 */}
                  <h1 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-gray-900 dark:text-white text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] mb-4">
                    {title.replace(/\s+tunisie\s*$/i, '')}{' '}
                    <span className="text-red-600 dark:text-red-400">Tunisie</span>
                  </h1>

                  {/* Intro — hard-clamped to 3 lines */}
                  {headerIntro && (
                    <p className="text-sm sm:text-[0.9rem] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3 max-w-xl">
                      {headerIntro}
                    </p>
                  )}

                  {/* Divider */}
                  <div className="h-px w-full max-w-xs bg-gray-200 dark:bg-gray-800 mt-5" />

                  {/* Mini stat row */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {[
                      { label: 'Livraison', value: '24-72h' },
                      { label: 'Produits', value: '100% Originaux' },
                      { label: 'Paiement', value: 'Cash à la livraison' },
                    ].map((stat) => (
                      <div key={stat.label} className="flex flex-col">
                        <span className="text-[10px] font-display font-semibold uppercase tracking-wider text-red-600/80 dark:text-red-400/70">{stat.label}</span>
                        <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-100">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Right column: benefit cards ── */}
                <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-2.5">
                  {GENERIC_BENEFITS.map((benefit, i) => {
                    const BIcon = benefit.icon;
                    return (
                      <div
                        key={i}
                        className="group flex gap-3 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shadow-sm hover:shadow-md hover:border-red-200 dark:hover:border-red-500/30 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
                          <BIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {benefit.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            {benefit.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}
        </div>
      )}

      {/* Full content (intro) – expanded below-fold */}
      {(showTop || showContentBelowFold) && hasIntro && (
        <CategorySeoLandingExpandable>
          <section className="prose prose-red dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:mt-6 prose-headings:mb-3">
            <div className="text-base sm:text-base leading-relaxed">
              {intro.includes('<') ? (
                <div dangerouslySetInnerHTML={{ __html: intro }} />
              ) : (
                textToParagraphs(intro)
              )}
            </div>
          </section>
        </CategorySeoLandingExpandable>
      )}

      {/* Full content (how to choose) */}
      {(showTop || showContentBelowFold) && hasHowTo && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 lg:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600" />
          <h2 className="text-lg sm:text-xl font-display uppercase tracking-tight font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-red-500" />
            {howToChooseTitle}
          </h2>
          <div className="text-gray-700 dark:text-gray-300 text-sm sm:text-[15px] leading-relaxed">
            {howToChooseBody.includes('<') ? (
              <div dangerouslySetInnerHTML={{ __html: howToChooseBody }} />
            ) : (
              textToParagraphs(howToChooseBody)
            )}
          </div>
        </section>
      )}

      {/* Full content (longBottomHtml) */}
      {(showTop || showContentBelowFold) && hasLongBottom && (
        <article
          className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 lg:p-8 shadow-sm"
          aria-labelledby="category-seo-long-heading"
        >
          <h2 id="category-seo-long-heading" className="text-lg sm:text-xl font-display uppercase tracking-tight font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-red-500" />
            En savoir plus
          </h2>
          <div
            className="prose prose-red dark:prose-invert max-w-none prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-headings:text-gray-900 dark:prose-headings:text-white prose-a:text-red-600 dark:prose-a:text-red-500 hover:prose-a:underline text-sm sm:text-[15px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: longBottomHtml! }}
          />
        </article>
      )}

      {/* Full content (FAQs) */}
      {(showTop || showContentBelowFold) && hasFaqs && (
        <section className="space-y-4">
          <h2 className="text-xl font-display uppercase tracking-tight font-bold text-gray-900 dark:text-white flex items-center gap-2 px-1">
            Questions fréquentes (FAQ)
          </h2>
          <div className="border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            {faqs.map((faq, i) => (
              <div key={i} className="group transition-colors duration-200 hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                <details className="group">
                  <summary className="list-none flex items-center justify-between gap-4 py-4 px-5 sm:px-6 cursor-pointer text-left font-semibold text-gray-900 dark:text-white transition-colors">
                    <span className="flex items-center gap-3">
                      <span className="text-red-500 font-bold text-sm sm:text-base shrink-0">Q{i + 1}.</span>
                      <span className="text-sm sm:text-[15px]">{faq.question}</span>
                    </span>
                    <span className="shrink-0 text-gray-400 group-open:rotate-180 transition-transform duration-300" aria-hidden>
                      <ChevronDown className="h-4.5 w-4.5" />
                    </span>
                  </summary>
                  <div className="pb-5 px-5 sm:px-6 pt-1 text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/20">
                    {faq.answer}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bottom suggestions (associated categories & top products) */}
      {showBottom && (hasRelated || hasBest) && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mt-4">
          {hasRelated && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-display uppercase tracking-tight font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-red-500" />
                Catégories associées
              </h2>
              <ul className="grid grid-cols-1 gap-2.5">
                {relatedCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={c.url}
                      className="group flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-red-50 dark:hover:bg-red-950/10 hover:border-red-200 dark:hover:border-red-900/40 transition-all duration-300"
                    >
                      <span className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                        {c.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasBest && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-display uppercase tracking-tight font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-red-500" />
                Produits phares
              </h2>
              <ul className="grid grid-cols-1 gap-2.5">
                {bestProducts.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={p.url}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-850 hover:bg-red-50 dark:hover:bg-red-950/10 hover:border-red-200 dark:hover:border-red-900/40 transition-all duration-300 group"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                        <Star className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-gray-800 dark:text-gray-200 group-hover:text-red-600 dark:group-hover:text-red-400 line-clamp-2 transition-colors">
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
