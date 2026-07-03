'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import {
  Check, MapPin, Truck, Shield, Award, Users, Star,
  Package, Heart, Sparkles, Zap, ChevronRight
} from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getCoordinates, getPageBySlug } from '@/services/api';
import { motion } from 'motion/react';
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

export default function AboutPageClient() {
  const [coordinates, setCoordinates] = useState<any>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCoordinates(), getPageBySlug('qui-sommes-nous')])
      .then(([coordsData, pageData]) => { setCoordinates(coordsData); setPage(pageData); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const parsedContent = useMemo(() => {
    if (!page?.body) return { sections: [], lists: [], paragraphs: [], keyNumbers: [] };
    return parseHTMLContent(page.body);
  }, [page?.body]);

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
  const statColors = [
    'from-amber-400 to-orange-500',
    'from-yellow-400 to-amber-500',
    'from-orange-400 to-amber-600',
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-amber-950 to-orange-950 text-white pt-12 pb-12 sm:pt-20 sm:pb-16 md:py-24">
          {/* Gold radial glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(245,158,11,0.18),transparent)]" />
          {/* Grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fbbf24' fill-opacity='0.4'%3E%3Crect x='0' y='0' width='1' height='40'/%3E%3Crect x='0' y='0' width='40' height='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
          {/* Gold top line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400" />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Eyebrow */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 mb-6"
            >
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.18em]">Notre histoire</span>
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-5 leading-[1.05] tracking-tight"
            >
              <span className="bg-gradient-to-br from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">
                {page?.title || 'Qui sommes nous ?'}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="text-gray-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed px-2"
            >
              Protein.tn — votre distributeur officiel d&apos;articles de sport et de compléments alimentaires en Tunisie depuis 2010.
            </motion.p>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-7"
            >
              <Link href="/shop"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm font-bold shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] transition-all"
              >
                <Package className="h-4 w-4" /> Nos produits
              </Link>
              <Link href="/contact"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-all"
              >
                <Users className="h-4 w-4" /> Nous contacter
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ── */}
        {keyNumbers.length > 0 && (
          <section className="py-10 sm:py-16 bg-gradient-to-b from-amber-50 to-white">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {keyNumbers.map((stat, i) => {
                  const Icon = statIcons[i] || Award;
                  const gradient = statColors[i] || statColors[0];
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: i * 0.1 }}
                      className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white border border-amber-100 shadow-[0_4px_24px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.15)] transition-all p-6 sm:p-8 text-center group"
                    >
                      {/* Background glow */}
                      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity blur-2xl`} />
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                      </div>
                      <div className={`text-3xl sm:text-4xl lg:text-5xl font-black bg-gradient-to-br ${gradient} bg-clip-text text-transparent mb-2`}>
                        {stat.value}
                      </div>
                      <div className="text-sm sm:text-base text-gray-600 font-semibold">{stat.label}</div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Dynamic content ── */}
        <section className="py-8 sm:py-14 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                <span className="text-gray-500 text-sm">Chargement...</span>
              </div>
            ) : page?.body ? (
              <div className="space-y-6 sm:space-y-8">
                {/* H2 sections as cards */}
                {parsedContent.sections.map((section, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 sm:p-8"
                  >
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-amber-100">
                      <div className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 flex-shrink-0" />
                      <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900">{section.title}</h2>
                    </div>
                    <div
                      className="prose prose-sm sm:prose-base max-w-none
                        prose-p:text-gray-600 prose-p:leading-7 prose-p:mb-4
                        prose-a:text-amber-600 hover:prose-a:text-orange-600
                        prose-strong:text-gray-900 prose-ul:text-gray-600 prose-li:mb-1"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </motion.div>
                ))}

                {/* Feature lists as icon cards */}
                {parsedContent.lists.map((list, li) => (
                  <motion.div
                    key={`list-${li}`}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 sm:p-8"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {list.items.map((item, ii) => {
                        const Icon = getIconForItem(item);
                        return (
                          <motion.div
                            key={ii}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: ii * 0.04 }}
                            className="flex items-start gap-3 p-4 rounded-xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <p className="text-sm sm:text-base text-gray-700 font-medium leading-relaxed flex-1">{item}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}

                {/* Remaining paragraphs */}
                {parsedContent.paragraphs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-2xl sm:rounded-3xl bg-white border border-gray-100 shadow-sm p-5 sm:p-8"
                  >
                    <div
                      className="prose prose-sm sm:prose-base max-w-none prose-p:text-gray-600 prose-p:leading-7 prose-a:text-amber-600 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: parsedContent.paragraphs.join('') }}
                    />
                  </motion.div>
                )}

                {/* Fallback raw HTML */}
                {parsedContent.sections.length === 0 && parsedContent.lists.length === 0 && parsedContent.paragraphs.length === 0 && (
                  <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 sm:p-8">
                    <div
                      className="prose prose-sm sm:prose-base max-w-none
                        prose-headings:text-gray-900 prose-h2:pb-3 prose-h2:border-b-2 prose-h2:border-amber-300 prose-h2:font-black
                        prose-p:text-gray-600 prose-p:leading-7
                        prose-a:text-amber-600 prose-strong:text-gray-900"
                      dangerouslySetInnerHTML={{ __html: page.body }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">Contenu non disponible pour le moment.</div>
            )}
          </div>
        </section>

        {/* ── Map ── */}
        <section className="py-8 sm:py-14 bg-gradient-to-b from-white to-amber-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-6 sm:mb-8 justify-center">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-200" />
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2 flex-shrink-0">
                  <MapPin className="h-5 w-5 text-amber-500" /> Notre localisation
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-200" />
              </div>

              <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-amber-100">
                {coordinates?.gelocalisation ? (
                  <div className="h-52 sm:h-72 lg:h-96 w-full"
                    dangerouslySetInnerHTML={{ __html: coordinates.gelocalisation }} />
                ) : (
                  <div className="h-52 sm:h-72 bg-amber-50 flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Carte en cours de chargement…</p>
                  </div>
                )}
                <div className="p-5 sm:p-7 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-gray-900 mb-1 break-words">Protein.tn — STE BITOUTA D&apos;ARTICLE DE SPORT</h3>
                      <p className="text-sm text-gray-500 break-words mb-1">{coordinates?.adresse || 'Sousse, Tunisie'}</p>
                      {coordinates?.phone && <p className="text-sm text-gray-500"><span className="font-semibold text-gray-700">Tél :</span> {coordinates.phone}</p>}
                      {coordinates?.email && <p className="text-sm text-gray-500 break-all"><span className="font-semibold text-gray-700">Email :</span> {coordinates.email}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-12 sm:py-20 relative overflow-hidden bg-gradient-to-br from-gray-900 via-amber-950 to-orange-950 text-white">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_100%,rgba(245,158,11,0.12),transparent)]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 mb-5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-[0.18em]">Rejoignez-nous</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 leading-tight">
                <span className="bg-gradient-to-br from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">
                  Rejoignez la communauté Protein.tn
                </span>
              </h2>
              <p className="text-gray-300 text-sm sm:text-base md:text-lg mb-8 leading-relaxed max-w-2xl mx-auto">
                Que vous soyez athlète professionnel, passionné de fitness ou débutant — Protein.tn est votre partenaire pour atteindre vos objectifs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/shop"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-sm sm:text-base font-bold shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.5)] transition-all"
                >
                  <Package className="h-4 w-4" /> Découvrir nos produits
                </Link>
                <Link href="/contact"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/25 bg-white/8 text-white text-sm sm:text-base font-semibold hover:bg-white/15 transition-all"
                >
                  <Users className="h-4 w-4" /> Nous contacter
                </Link>
              </div>
              <p className="mt-7 text-xs sm:text-sm text-gray-400 max-w-xl mx-auto">
                <strong className="text-gray-300">Proteine Tunisie – Protein.tn :</strong> Votre expert en nutrition sportive depuis 2010. Basé à Sousse, livraison rapide partout en Tunisie.
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
