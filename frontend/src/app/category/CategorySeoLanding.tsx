'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'motion/react';
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
  HeartHandshake
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

      {/* Header section - Custom ultra-premium layouts */}
      {showHeader && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
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
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:border-red-500/20 dark:hover:border-red-500/20 transition-all duration-300 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 group-hover:bg-red-600 group-hover:text-white transition-colors duration-300">
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

          {/* SPECIAL CREATINE CUSTOM HERO */}
          {isCreatine ? (
            <div className="relative p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-amber-200/60 dark:border-amber-900/30 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 dark:from-gray-900 dark:via-amber-950/10 dark:to-orange-950/15 overflow-hidden shadow-md">
              {/* Glow effects & animations */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/20 via-orange-400/10 to-transparent dark:from-amber-500/10 dark:via-orange-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-300/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* CSS Particle background (delicate dots in gold/amber color) */}
              <div className="absolute inset-0 opacity-[0.15] dark:opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(217,119,6,0.15)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:20px_20px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 min-w-0 text-center lg:text-left">
                  {/* Premium Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/25 mb-4 sm:mb-5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-amber-800 dark:text-amber-350 font-bold uppercase tracking-wider">
                      Force & Volume Maximum
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                    Créatine <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.25)]">Tunisie</span>
                  </h1>

                  <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-350 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0">
                    Vous souhaitez franchir un palier et augmenter votre force de manière explosive ? Sur <strong>Protein.tn</strong>, découvrez les meilleures formules de <strong>créatine monohydrate</strong>, micronisée et labellisée Creapure® aux meilleurs prix en Tunisie. Importation 100% officielle avec livraison express chez vous.
                  </p>

                  {/* Horizontal mini-guide tags */}
                  <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/5 dark:bg-white/[0.04] border border-amber-500/10 dark:border-white/[0.06] text-amber-800 dark:text-neutral-300 font-medium"># Monohydrate</span>
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/5 dark:bg-white/[0.04] border border-amber-500/10 dark:border-white/[0.06] text-amber-800 dark:text-neutral-300 font-medium"># Creapure®</span>
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/5 dark:bg-white/[0.04] border border-amber-500/10 dark:border-white/[0.06] text-amber-800 dark:text-neutral-300 font-medium"># Micronisée</span>
                    <span className="px-3 py-1.5 rounded-lg bg-amber-500/5 dark:bg-white/[0.04] border border-amber-500/10 dark:border-white/[0.06] text-amber-800 dark:text-neutral-300 font-medium"># Capsules</span>
                  </div>
                </div>

                {/* Creatine benefits grid inside hero */}
                <div className="w-full lg:w-[350px] shrink-0 space-y-3">
                  {CREATINE_BENEFITS.map((benefit, i) => {
                    const BIcon = benefit.icon;
                    return (
                      <div 
                        key={i}
                        className="flex gap-3 p-3.5 rounded-xl border border-amber-100 dark:border-white/[0.05] bg-white/95 dark:bg-white/[0.03] shadow-sm hover:border-amber-300 dark:hover:border-amber-500/30 transition-all duration-300 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-white transition-all duration-300">
                          <BIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {benefit.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400 mt-1 leading-snug">
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
            /* Premium Red Hero Header — matches creatine layout, brand-red palette */
            <div className="relative p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-red-200/60 dark:border-red-900/30 bg-gradient-to-br from-white via-red-50/20 to-gray-50/30 dark:from-gray-900 dark:via-red-950/10 dark:to-gray-950/15 overflow-hidden shadow-md">
              {/* Glow blobs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-400/20 via-rose-400/10 to-transparent dark:from-red-500/10 dark:via-rose-500/5 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-red-300/10 dark:bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
              {/* Dot grid */}
              <div className="absolute inset-0 opacity-[0.15] dark:opacity-10 bg-[radial-gradient(circle_at_1px_1px,rgba(220,38,38,0.15)_1px,transparent_0)] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] bg-[size:20px_20px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1 min-w-0 text-center lg:text-left">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 dark:bg-red-500/20 border border-red-500/25 mb-4 sm:mb-5">
                    <Sparkles className="h-3.5 w-3.5 text-red-600 dark:text-red-400 animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-red-800 dark:text-red-300 font-bold uppercase tracking-wider">
                      Qualité Premium
                    </span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">
                    {title}{' '}
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-rose-500 to-red-600 drop-shadow-[0_2px_10px_rgba(220,38,38,0.25)]">
                      Tunisie
                    </span>
                  </h1>

                  {headerIntro && (
                    <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0">
                      {headerIntro.slice(0, 220)}
                    </p>
                  )}
                </div>

                {/* Benefit cards */}
                <div className="w-full lg:w-[340px] shrink-0 space-y-3">
                  {GENERIC_BENEFITS.map((benefit, i) => {
                    const BIcon = benefit.icon;
                    return (
                      <div
                        key={i}
                        className="flex gap-3 p-3.5 rounded-xl border border-red-100 dark:border-white/[0.05] bg-white/95 dark:bg-white/[0.03] shadow-sm hover:border-red-300 dark:hover:border-red-500/30 transition-all duration-300 group"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 group-hover:bg-gradient-to-r group-hover:from-red-500 group-hover:to-rose-500 group-hover:text-white transition-all duration-300">
                          <BIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            {benefit.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-neutral-400 mt-1 leading-snug">
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
        </motion.div>
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
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30 p-5 sm:p-6 lg:p-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
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
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 lg:p-8 shadow-sm relative"
          aria-labelledby="category-seo-long-heading"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-50/10 to-transparent dark:from-red-900/5 rounded-full blur-2xl pointer-events-none" />
          <h2 id="category-seo-long-heading" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 px-1">
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
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
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
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
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
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                        ★
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
