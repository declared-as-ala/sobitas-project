'use client';

import { useEffect, useState, useMemo } from 'react';
import { PageHeader } from '@/app/components/PageHeader';
import {
  Check, MapPin, Truck, Shield, Award, Users, Star,
  Package, Heart, Sparkles
} from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getCoordinates, getPageBySlug } from '@/services/api';
import Link from 'next/link';
import type { Page } from '@/types';

const iconMap: Record<string, any> = {
  'qualité': Check, 'qualite': Check,
  'sécurité': Shield, 'securite': Shield, 'sécurite': Shield,
  'livraison': Truck, 'rapide': Truck,
  'expérience': Award, 'experience': Award,
  'client': Users,
  'satisfaction': Heart,
  'produit': Package,
  'service': Sparkles,
};

const getIconForItem = (text: string) => {
  const lowerText = text.toLowerCase();
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (lowerText.includes(key)) return Icon;
  }
  return Check;
};

const parseHTMLContent = (html: string) => {
  if (!html) return { sections: [], lists: [], paragraphs: [], keyNumbers: [] };
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections: Array<{ title: string; content: string }> = [];
  const lists: Array<{ items: string[] }> = [];
  const paragraphs: string[] = [];
  const keyNumbers: Array<{ label: string; value: string }> = [];

  const keyNumberPatterns = [
    { pattern: /(\d+)\s*\+\s*ans?\s*d['\']expérience/i, label: 'ans d\'expérience' },
    { pattern: /depuis\s*(\d{4})/i, label: 'Depuis' },
    { pattern: /livraison\s*nationale/i, label: 'Livraison nationale' },
    { pattern: /(\d+)\s*\+\s*clients?/i, label: 'clients satisfaits' },
  ];

  const body = doc.body;
  let currentSection: { title: string; content: string } | null = null;

  Array.from(body.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      if (tagName === 'h2') {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: element.textContent || '', content: '' };
      } else if (tagName === 'ul') {
        const items: string[] = [];
        element.querySelectorAll('li').forEach(li => { const t = li.textContent?.trim() || ''; if (t) items.push(t); });
        if (items.length > 0) lists.push({ items });
        if (currentSection) currentSection.content += element.outerHTML;
        else paragraphs.push(element.outerHTML);
      } else if (tagName === 'p') {
        const text = element.textContent || '';
        keyNumberPatterns.forEach(({ pattern, label }) => {
          const match = text.match(pattern);
          if (match && !keyNumbers.some(k => k.label === label)) {
            keyNumbers.push({ label, value: match[1] || match[0] });
          }
        });
        if (currentSection) currentSection.content += element.outerHTML;
        else paragraphs.push(element.outerHTML);
      } else if (currentSection) {
        currentSection.content += element.outerHTML;
      } else {
        paragraphs.push(element.outerHTML);
      }
    }
  });
  if (currentSection) sections.push(currentSection);

  const fullText = body.textContent || '';
  const yearsMatch = fullText.match(/(\d+)\s*\+\s*ans?\s*d['\']expérience/i);
  const sinceMatch = fullText.match(/depuis\s*(\d{4})/i);
  if (yearsMatch && !keyNumbers.some(k => k.label.includes('expérience'))) keyNumbers.push({ label: 'ans d\'expérience', value: yearsMatch[1] });
  if (sinceMatch && !keyNumbers.some(k => k.label === 'Depuis')) keyNumbers.push({ label: 'Depuis', value: sinceMatch[1] });
  if (fullText.toLowerCase().includes('livraison nationale') && !keyNumbers.some(k => k.label.includes('Livraison'))) keyNumbers.push({ label: 'Livraison nationale', value: 'Toute la Tunisie' });

  const uniqueKeyNumbers = Array.from(new Map(keyNumbers.map(item => [item.label, item])).values());
  return { sections, lists, paragraphs, keyNumbers: uniqueKeyNumbers };
};

export default function AboutPageClient({
  initialPage = null,
  initialCoordinates = null,
}: {
  initialPage?: Page | null;
  initialCoordinates?: any;
} = {}) {
  const [coordinates, setCoordinates] = useState<any>(initialCoordinates);
  const [page, setPage] = useState<Page | null>(initialPage);
  const [loading, setLoading] = useState(!initialPage);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Data is provided server-side (SSR/crawlers see the body); only fetch client-side if missing.
    if (!initialPage || !initialCoordinates) {
      Promise.all([getCoordinates(), getPageBySlug('qui-sommes-nous')])
        .then(([coordsData, pageData]) => {
          if (!initialCoordinates) setCoordinates(coordsData);
          if (!initialPage) setPage(pageData);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedContent = useMemo(() => {
    // parseHTMLContent uses DOMParser (browser only) — gate on `mounted` so the server and the
    // first client render both fall through to the raw-HTML block below (no DOMParser on the
    // server, no hydration mismatch). The enhanced card layout appears after hydration.
    if (!mounted || !page?.body) return { sections: [], lists: [], paragraphs: [], keyNumbers: [] };
    return parseHTMLContent(page.body);
  }, [mounted, page?.body]);

  const defaultKeyNumbers = [
    { label: 'ans d\'expérience', value: '16+' },
    { label: 'Depuis', value: '2010' },
    { label: 'Livraison nationale', value: 'Toute la Tunisie' },
  ];

  const keyNumbersMap = new Map<string, { label: string; value: string }>();
  defaultKeyNumbers.forEach(item => keyNumbersMap.set(item.label, item));
  parsedContent.keyNumbers.forEach(item => keyNumbersMap.set(item.label, item));
  const keyNumbers = [
    keyNumbersMap.get('ans d\'expérience') || defaultKeyNumbers[0],
    keyNumbersMap.get('Depuis') || defaultKeyNumbers[1],
    keyNumbersMap.get('Livraison nationale') || defaultKeyNumbers[2],
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const statIcons = [Award, Star, Truck];

  return (
    <div className="min-h-screen bg-canvas">
<main>
        {/* ── Hero ── */}
        <section className="border-b border-hairline bg-canvas">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
            <PageHeader
              align="center"
              kicker="Notre histoire"
              title={page?.title || 'Qui sommes-nous ?'}
              subtitle="Protein.tn — votre distributeur officiel d'articles de sport et de compléments alimentaires en Tunisie."
            >
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-white px-5 py-2.5 text-sm font-display uppercase tracking-wide font-semibold transition-colors"
                >
                  <Package className="h-4 w-4" /> Nos produits
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 text-ink-1 px-5 py-2.5 text-sm font-semibold transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400"
                >
                  <Users className="h-4 w-4" /> Nous contacter
                </Link>
              </div>
            </PageHeader>
          </div>
        </section>

        {/* ── Stats ── */}
        {keyNumbers.length > 0 && (
          <section className="py-12 sm:py-16 lg:py-20 bg-canvas">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {keyNumbers.map((stat, i) => {
                  const Icon = statIcons[i] || Award;
                  // Numeric stats ('16+', '2010') get the giant condensed treatment; a phrase value
                  // ('Toute la Tunisie') gets a smaller size so it doesn't wrap into awkward lines.
                  const isNumeric = /\d/.test(stat.value);
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-hairline bg-elevated p-6 sm:p-8 text-center transition-shadow hover:shadow-md"
                    >
                      <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 text-brand flex items-center justify-center">
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                      </div>
                      <div
                        className={
                          isNumeric
                            ? 'font-display font-bold tracking-tight tabular-nums text-3xl sm:text-4xl lg:text-5xl text-ink-1 mb-2'
                            : 'font-display font-bold uppercase tracking-tight leading-tight text-xl sm:text-2xl text-ink-1 mb-2 text-balance'
                        }
                      >
                        {stat.value}
                      </div>
                      <div className="text-sm sm:text-base text-ink-2 font-medium">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Dynamic content ── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-canvas">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="space-y-6 sm:space-y-8">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-elevated border border-hairline shadow-sm p-5 sm:p-8"
                  >
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-hairline">
                      <Skeleton className="w-1 h-6 rounded-full" />
                      <Skeleton className="h-6 w-48 max-w-full rounded" />
                    </div>
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-11/12 rounded" />
                      <Skeleton className="h-4 w-4/5 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : page?.body ? (
              <div className="space-y-6 sm:space-y-8">
                {/* H2 sections as cards */}
                {parsedContent.sections.map((section, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-elevated border border-hairline shadow-sm hover:shadow-md transition-shadow p-5 sm:p-8"
                  >
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-hairline">
                      <div className="w-1 h-6 rounded-full bg-red-600 flex-shrink-0" />
                      <h2 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-xl sm:text-2xl text-ink-1">{section.title}</h2>
                    </div>
                    <div
                      className="prose prose-sm sm:prose-base max-w-none dark:prose-invert
                        prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-7 prose-p:mb-4
                        prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-700
                        prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:text-gray-600 dark:prose-ul:text-gray-400 prose-li:mb-1
                        [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                ))}

                {/* Feature lists as icon cards */}
                {parsedContent.lists.map((list, li) => (
                  <div
                    key={`list-${li}`}
                    className="rounded-xl bg-sunken border border-hairline p-5 sm:p-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {list.items.map((item, ii) => {
                        const Icon = getIconForItem(item);
                        return (
                          <div
                            key={ii}
                            className="flex items-start gap-3 p-4 rounded-xl bg-canvas border border-hairline transition-colors hover:border-red-200 dark:hover:border-red-900/60"
                          >
                            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-red-50 dark:bg-red-950/40 text-brand flex items-center justify-center">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} />
                            </div>
                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed flex-1">{item}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Remaining paragraphs */}
                {parsedContent.paragraphs.length > 0 && (
                  <div className="rounded-xl bg-elevated border border-hairline shadow-sm p-5 sm:p-8">
                    <div
                      className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-7 prose-a:text-red-600 dark:prose-a:text-red-400 prose-strong:text-gray-900 dark:prose-strong:text-white [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: parsedContent.paragraphs.join('') }}
                    />
                  </div>
                )}

                {/* Fallback raw HTML */}
                {parsedContent.sections.length === 0 && parsedContent.lists.length === 0 && parsedContent.paragraphs.length === 0 && (
                  <div className="rounded-xl bg-elevated border border-hairline shadow-sm p-5 sm:p-8">
                    <div
                      className="prose prose-sm sm:prose-base max-w-none dark:prose-invert
                        prose-headings:text-gray-900 dark:prose-headings:text-white prose-h2:pb-3 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-800 prose-h2:font-display prose-h2:uppercase prose-h2:tracking-tight
                        prose-p:text-gray-600 dark:prose-p:text-gray-400 prose-p:leading-7
                        prose-a:text-red-600 dark:prose-a:text-red-400 prose-strong:text-gray-900 dark:prose-strong:text-white
                        [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: page.body }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">Contenu non disponible pour le moment.</div>
            )}
          </div>
        </section>

        {/* ── Map ── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-canvas">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-6 sm:mb-8 justify-center">
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              <h2 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-xl sm:text-2xl text-ink-1 flex items-center gap-2 flex-shrink-0">
                <MapPin className="h-5 w-5 text-brand" strokeWidth={1.75} /> Notre localisation
              </h2>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>

            <div className="rounded-xl overflow-hidden shadow-sm border border-hairline">
              {coordinates?.gelocalisation ? (
                <div className="h-52 sm:h-72 lg:h-96 w-full"
                  dangerouslySetInnerHTML={{ __html: coordinates.gelocalisation }} />
              ) : (
                <div className="h-52 sm:h-72 bg-sunken flex items-center justify-center">
                  <p className="text-gray-400 dark:text-gray-500 text-sm">Carte en cours de chargement…</p>
                </div>
              )}
              <div className="p-5 sm:p-7 bg-elevated">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-red-50 dark:bg-red-950/40 text-brand flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display uppercase tracking-wide text-base sm:text-lg font-semibold text-ink-1 mb-1 break-words">Protein.tn — STE BITOUTA D&apos;ARTICLE DE SPORT</h3>
                    <p className="text-sm text-ink-3 break-words mb-1">{coordinates?.adresse || 'Sousse, Tunisie'}</p>
                    {coordinates?.phone && <p className="text-sm text-ink-3"><span className="font-semibold text-gray-700 dark:text-gray-300">Tél :</span> {coordinates.phone}</p>}
                    {coordinates?.email && <p className="text-sm text-ink-3 break-all"><span className="font-semibold text-gray-700 dark:text-gray-300">Email :</span> {coordinates.email}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-12 sm:py-16 lg:py-20 bg-sunken border-t border-hairline">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <span className="inline-flex items-center gap-2 mb-3 font-display uppercase tracking-[0.2em] text-[11px] sm:text-xs font-semibold text-brand">
              <span className="h-px w-5 bg-red-600 dark:bg-red-400" aria-hidden="true" />
              Rejoignez-nous
            </span>
            <h2 className="font-display uppercase tracking-tight leading-[0.95] font-bold text-2xl sm:text-3xl md:text-4xl text-ink-1 mb-4">
              Rejoignez la communauté Protein.tn
            </h2>
            <p className="text-ink-2 text-sm sm:text-base md:text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
              Que vous soyez athlète professionnel, passionné de fitness ou débutant — Protein.tn est votre partenaire pour atteindre vos objectifs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm sm:text-base font-display uppercase tracking-wide font-semibold transition-colors"
              >
                <Package className="h-4 w-4" /> Découvrir nos produits
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-ink-1 text-sm sm:text-base font-semibold transition-colors hover:border-red-600 hover:text-red-600 dark:hover:border-red-400 dark:hover:text-red-400"
              >
                <Users className="h-4 w-4" /> Nous contacter
              </Link>
            </div>
            <p className="mt-7 text-xs sm:text-sm text-ink-3 max-w-xl mx-auto">
              <strong className="text-gray-700 dark:text-gray-300">Proteine Tunisie – Protein.tn :</strong> Votre expert en nutrition sportive depuis 2010. Basé à Sousse, livraison rapide partout en Tunisie.
            </p>
          </div>
        </section>
      </main>
<ScrollToTop />
    </div>
  );
}
