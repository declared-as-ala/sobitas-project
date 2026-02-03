'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { 
  Check, MapPin, Truck, Shield, Award, Users, Star, 
  Calendar, Package, TrendingUp, Heart, Sparkles 
} from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getCoordinates, getPageBySlug } from '@/services/api';
import { motion } from 'motion/react';
import Link from 'next/link';
import type { Page } from '@/types';

// Icon mapping for list items
const iconMap: Record<string, any> = {
  'qualité': Check,
  'qualite': Check,
  'sécurité': Shield,
  'securite': Shield,
  'sécurite': Shield,
  'livraison': Truck,
  'rapide': Truck,
  'expérience': Award,
  'experience': Award,
  'client': Users,
  'satisfaction': Heart,
  'produit': Package,
  'service': Sparkles,
};

// Helper function to get icon for a list item
const getIconForItem = (text: string) => {
  const lowerText = text.toLowerCase();
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (lowerText.includes(key)) {
      return Icon;
    }
  }
  return Check; // Default icon
};

// Parse HTML and extract structured content
const parseHTMLContent = (html: string) => {
  if (!html) return { sections: [], lists: [], paragraphs: [], keyNumbers: [] };

  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const sections: Array<{ title: string; content: string }> = [];
  const lists: Array<{ items: string[] }> = [];
  const paragraphs: string[] = [];
  const keyNumbers: Array<{ label: string; value: string }> = [];

  // Extract key numbers patterns
  const keyNumberPatterns = [
    { pattern: /(\d+)\s*\+\s*ans?\s*d['\']expérience/i, label: 'ans d\'expérience' },
    { pattern: /depuis\s*(\d{4})/i, label: 'Depuis' },
    { pattern: /livraison\s*nationale/i, label: 'Livraison nationale' },
    { pattern: /(\d+)\s*\+\s*clients?/i, label: 'clients satisfaits' },
  ];

  // Process all elements
  const body = doc.body;
  let currentSection: { title: string; content: string } | null = null;

  Array.from(body.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (tagName === 'h2') {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: element.textContent || '',
          content: '',
        };
      } else if (tagName === 'ul') {
        const items: string[] = [];
        element.querySelectorAll('li').forEach((li) => {
          const text = li.textContent?.trim() || '';
          if (text) items.push(text);
        });
        if (items.length > 0) {
          lists.push({ items });
        }
        if (currentSection) {
          currentSection.content += element.outerHTML;
        } else {
          paragraphs.push(element.outerHTML);
        }
      } else if (tagName === 'p') {
        const text = element.textContent || '';
        // Check for key numbers (avoid duplicates)
        keyNumberPatterns.forEach(({ pattern, label }) => {
          const match = text.match(pattern);
          if (match) {
            const value = match[1] || match[0];
            // Only add if we don't already have this label
            if (!keyNumbers.some(k => k.label === label)) {
              keyNumbers.push({ label, value });
            }
          }
        });
        if (currentSection) {
          currentSection.content += element.outerHTML;
        } else {
          paragraphs.push(element.outerHTML);
        }
      } else if (currentSection) {
        currentSection.content += element.outerHTML;
      } else {
        paragraphs.push(element.outerHTML);
      }
    }
  });

  // Add last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Extract key numbers from text content (only if not already found)
  const fullText = body.textContent || '';
  const yearsMatch = fullText.match(/(\d+)\s*\+\s*ans?\s*d['\']expérience/i);
  const sinceMatch = fullText.match(/depuis\s*(\d{4})/i);
  
  // Check if we already have these key numbers to avoid duplicates
  const hasExperience = keyNumbers.some(k => k.label.includes('expérience'));
  const hasSince = keyNumbers.some(k => k.label === 'Depuis');
  const hasLivraison = keyNumbers.some(k => k.label.includes('Livraison'));
  
  if (yearsMatch && !hasExperience) {
    keyNumbers.push({ label: 'ans d\'expérience', value: yearsMatch[1] });
  }
  if (sinceMatch && !hasSince) {
    keyNumbers.push({ label: 'Depuis', value: sinceMatch[1] });
  }
  if (fullText.toLowerCase().includes('livraison nationale') && !hasLivraison) {
    keyNumbers.push({ label: 'Livraison nationale', value: 'Toute la Tunisie' });
  }

  // Deduplicate key numbers by label
  const uniqueKeyNumbers = Array.from(
    new Map(keyNumbers.map(item => [item.label, item])).values()
  );

  return { sections, lists, paragraphs, keyNumbers: uniqueKeyNumbers };
};

export default function AboutPageClient() {
  const [coordinates, setCoordinates] = useState<any>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coordsData, pageData] = await Promise.all([
          getCoordinates(),
          getPageBySlug('qui-sommes-nous')
        ]);
        setCoordinates(coordsData);
        setPage(pageData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Parse HTML content
  const parsedContent = useMemo(() => {
    if (!page?.body) return { sections: [], lists: [], paragraphs: [], keyNumbers: [] };
    return parseHTMLContent(page.body);
  }, [page?.body]);

  // Always show all three key numbers - merge parsed with defaults
  const defaultKeyNumbers = [
    { label: 'ans d\'expérience', value: '12+' },
    { label: 'Depuis', value: '2010' },
    { label: 'Livraison nationale', value: 'Toute la Tunisie' },
  ];

  // Merge parsed key numbers with defaults, prioritizing parsed values
  const keyNumbersMap = new Map<string, { label: string; value: string }>();
  
  // First add defaults
  defaultKeyNumbers.forEach(item => {
    keyNumbersMap.set(item.label, item);
  });
  
  // Then override with parsed values if they exist
  parsedContent.keyNumbers.forEach(item => {
    keyNumbersMap.set(item.label, item);
  });
  
  // Convert back to array, maintaining order: experience, depuis, livraison
  const keyNumbers = [
    keyNumbersMap.get('ans d\'expérience') || defaultKeyNumbers[0],
    keyNumbersMap.get('Depuis') || defaultKeyNumbers[1],
    keyNumbersMap.get('Livraison nationale') || defaultKeyNumbers[2],
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* Enhanced Hero Section - Mobile First */}
        <section className="relative bg-gradient-to-br from-red-700 via-red-800 to-red-900 text-white pt-12 pb-8 sm:pt-16 sm:pb-12 md:py-20 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 md:mb-4 lg:mb-6 leading-tight">
                {page?.title || 'Qui sommes nous ?'}
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed px-2 mb-0">
                SOBITAS, votre distributeur officiel d'articles de sport et de compléments alimentaires en Tunisie
              </p>
            </motion.div>
          </div>
        </section>

        {/* Key Numbers Section - Mobile First, Enhanced Desktop */}
        {keyNumbers.length > 0 && (
          <section className="py-6 sm:py-12 md:py-16 lg:py-20 xl:py-24 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10"
              >
                {keyNumbers.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 text-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-red-100 dark:border-red-900/30 flex flex-col items-center justify-center"
                  >
                    <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-red-600 dark:text-red-400 mb-2 sm:mb-3 md:mb-4 text-center w-full">
                      {stat.value}
                    </div>
                    <div className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 dark:text-gray-300 font-medium text-center w-full">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>
        )}

        {/* Dynamic Content - Enhanced - Mobile First */}
        <section className="py-6 sm:py-12 md:py-16 lg:py-20 bg-gray-50 dark:bg-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : page?.body ? (
              <div className="space-y-6 sm:space-y-8 md:space-y-12">
                {/* Render H2 Sections as Cards */}
                {parsedContent.sections.map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 mb-6 sm:mb-8 ${
                      index % 2 === 0 ? '' : 'bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800'
                    }`}
                  >
                    <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-red-600 dark:border-red-400 text-left">
                      {section.title}
                    </h2>
                    <div
                      className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none text-left
                        prose-headings:text-gray-900 dark:prose-headings:text-white
                        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:text-sm sm:prose-p:text-base md:prose-p:text-lg prose-p:mb-4
                        prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-700
                        prose-strong:text-gray-900 dark:prose-strong:text-white
                        prose-ul:text-left prose-ol:text-left"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </motion.div>
                ))}

                {/* Render Lists as Stacked Cards on Mobile, Grid on Desktop */}
                {parsedContent.lists.map((list, listIndex) => (
                  <motion.div
                    key={`list-${listIndex}`}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 mb-6 sm:mb-8"
                  >
                    <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                      {list.items.map((item, itemIndex) => {
                        const Icon = getIconForItem(item);
                        return (
                          <motion.div
                            key={itemIndex}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: itemIndex * 0.05 }}
                            className="flex items-start gap-3 p-4 sm:p-5 rounded-xl bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-gray-800 border border-red-100 dark:border-red-900/20 hover:shadow-md transition-shadow duration-300 w-full"
                          >
                            <div className="flex-shrink-0 mt-0.5 sm:mt-1">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-red-600 dark:bg-red-500 flex items-center justify-center">
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </div>
                            </div>
                            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium leading-relaxed flex-1 text-left">
                              {item}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}

                {/* Render remaining paragraphs */}
                {parsedContent.paragraphs.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 mb-6 sm:mb-8"
                  >
                    <div
                      className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none text-left
                        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                        prose-p:text-sm sm:prose-p:text-base md:prose-p:text-lg prose-p:mb-4
                        prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-700
                        prose-strong:text-gray-900 dark:prose-strong:text-white"
                      dangerouslySetInnerHTML={{ __html: parsedContent.paragraphs.join('') }}
                    />
                  </motion.div>
                )}

                {/* Fallback: If no sections/lists found, render raw HTML with better styling */}
                {parsedContent.sections.length === 0 && parsedContent.lists.length === 0 && parsedContent.paragraphs.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 lg:p-10 mb-6 sm:mb-8"
                  >
                    <div
                      className="prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none text-left
                        prose-headings:text-gray-900 dark:prose-headings:text-white
                        prose-h2:text-lg sm:prose-h2:text-xl md:prose-h2:text-2xl lg:prose-h2:text-3xl prose-h2:font-bold prose-h2:mb-4 sm:prose-h2:mb-6 prose-h2:pb-3 sm:prose-h2:pb-4 prose-h2:border-b-2 prose-h2:border-red-600
                        prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                        prose-p:text-sm sm:prose-p:text-base md:prose-p:text-lg prose-p:mb-4
                        prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ul:text-left
                        prose-li:mb-3 prose-li:leading-relaxed prose-li:text-sm sm:prose-li:text-base
                        prose-a:text-red-600 dark:prose-a:text-red-400 hover:prose-a:text-red-700
                        prose-strong:text-gray-900 dark:prose-strong:text-white"
                      dangerouslySetInnerHTML={{ __html: page.body }}
                    />
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Contenu non disponible pour le moment.
              </div>
            )}
          </div>
        </section>

        {/* Map Section - Enhanced - Mobile First */}
        <section className="py-6 sm:py-12 md:py-16 lg:py-20 bg-white dark:bg-gray-900">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 md:mb-10 text-center">
                Notre localisation
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {coordinates?.gelocalisation ? (
                  <div
                    className="h-56 sm:h-72 lg:h-96 w-full min-h-[200px]"
                    dangerouslySetInnerHTML={{ __html: coordinates.gelocalisation }}
                  />
                ) : (
                  <div className="h-56 sm:h-72 lg:h-96 w-full min-h-[200px] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 px-4">Carte en cours de chargement...</p>
                  </div>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                        SOBITAS - STE BITOUTA D'ARTICLE DE SPORT
                      </h3>
                      <p className="text-base text-gray-600 dark:text-gray-400 break-words mb-4">
                        {coordinates?.adresse || 'Sousse, Tunisie'}
                      </p>
                      {coordinates?.phone && (
                        <p className="text-base text-gray-600 dark:text-gray-400 mb-2 break-words">
                          <strong className="text-gray-900 dark:text-white">Téléphone:</strong> {coordinates.phone}
                        </p>
                      )}
                      {coordinates?.email && (
                        <p className="text-base text-gray-600 dark:text-gray-400 break-all">
                          <strong className="text-gray-900 dark:text-white">Email:</strong> {coordinates.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Enhanced CTA Section - Mobile First */}
        <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-gradient-to-br from-red-700 via-red-800 to-red-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-4 sm:mb-6">
                Rejoignez la communauté SOBITAS
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl opacity-95 mb-6 sm:mb-8 md:mb-10 max-w-3xl mx-auto leading-relaxed px-2">
                Que vous soyez un athlète professionnel, passionné de fitness ou débutant, SOBITAS est votre partenaire pour atteindre vos objectifs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center w-full sm:w-auto">
                <Link
                  href="/shop"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-4 sm:py-4 bg-white text-red-700 font-bold text-base sm:text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 hover:bg-gray-50 min-h-[48px] touch-manipulation"
                >
                  <Package className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Découvrir nos produits</span>
                </Link>
                <Link
                  href="/contact"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-4 sm:py-4 bg-transparent border-2 border-white text-white font-bold text-base sm:text-lg rounded-xl hover:bg-white/10 transition-all duration-300 min-h-[48px] touch-manipulation"
                >
                  <Users className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>Nous contacter</span>
                </Link>
              </div>
              <p className="mt-6 sm:mt-8 text-xs sm:text-sm md:text-base lg:text-lg opacity-90 max-w-2xl mx-auto px-2">
                <strong>Protein.tn – SOBITAS :</strong> Votre expert en nutrition sportive depuis 2010. Basé à Sousse, livraison rapide et gratuite partout en Tunisie.
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
