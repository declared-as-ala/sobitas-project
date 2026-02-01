'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Check, MapPin, Truck, Shield, Award, Users } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { getCoordinates, getPageBySlug } from '@/services/api';
import { motion } from 'motion/react';
import type { Page } from '@/types';

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-red-600 to-red-700 text-white py-8 sm:py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              {page?.title || 'Qui sommes nous ?'}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl opacity-90 max-w-3xl">
              SOBITAS, votre distributeur officiel d'articles de sport et de compléments alimentaires en Tunisie
            </p>
          </div>
        </section>

        {/* Dynamic Content */}
        <section className="py-8 sm:py-12 lg:py-16 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
            ) : page?.body ? (
              <div
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-red-600 dark:prose-headings:text-red-400 prose-a:text-red-600 hover:prose-a:text-red-500"
                dangerouslySetInnerHTML={{ __html: page.body }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                Contenu non disponible pour le moment.
              </div>
            )}
          </div>
        </section>

        {/* Map Section */}
        <section className="py-8 sm:py-12 lg:py-16 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 lg:mb-8 text-center px-1">
              Notre localisation
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl shadow-lg overflow-hidden">
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
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 min-w-0">
                  <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2 break-words">
                      SOBITAS - STE BITOUTA D'ARTICLE DE SPORT
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                      {coordinates?.adresse || 'Sousse, Tunisie'}
                    </p>
                    {coordinates?.phone && (
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2 break-words">
                        <strong>Téléphone:</strong> {coordinates.phone}
                      </p>
                    )}
                    {coordinates?.email && (
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-all">
                        <strong>Email:</strong> {coordinates.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-8 sm:py-12 lg:py-16 bg-gradient-to-r from-red-600 to-red-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 px-1">
              Rejoignez la communauté SOBITAS
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl opacity-90 mb-4 sm:mb-6 lg:mb-8 max-w-3xl mx-auto px-1 leading-relaxed">
              Que vous soyez un athlète professionnel, passionné de fitness ou débutant, SOBITAS est votre partenaire pour atteindre vos objectifs. Commandez dès maintenant et découvrez pourquoi nous sommes le leader en nutrition sportive en Tunisie.
            </p>
            <p className="text-sm sm:text-base lg:text-lg opacity-80 px-1 break-words">
              <strong>Protein.tn – SOBITAS :</strong> Votre expert en nutrition sportive depuis 2010. Basé à Sousse, livraison rapide et gratuite partout en Tunisie.
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
