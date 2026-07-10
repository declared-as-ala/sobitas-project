'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Phone, Mail, MapPin, Clock, Send, Loader2, ArrowRight } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { sendContact } from '@/services/api';
import { toast } from 'sonner';
import type { Coordinate } from '@/types';

export default function ContactPageClient({
  coordinates = null,
}: {
  coordinates?: Coordinate | null;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await sendContact(formData);
      toast.success('Message envoyé avec succès !');
      setFormData({
        name: '',
        email: '',
        message: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-10 sm:mb-12">
          <PageHeader
            align="center"
            kicker="Contact"
            title="Contactez-nous"
            subtitle="Nous sommes là pour répondre à toutes vos questions"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <Phone className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Téléphone
                  </h3>
                  <div className="flex flex-col gap-1 text-gray-600 dark:text-gray-400">
                    <a
                      href="tel:73200169"
                      className="inline-flex min-h-11 items-center rounded-lg -mx-2 px-2 transition-colors hover:text-red-600 hover:bg-red-50/60 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                    >
                      73 200 169
                    </a>
                    <a
                      href="tel:27612500"
                      className="inline-flex min-h-11 items-center rounded-lg -mx-2 px-2 transition-colors hover:text-red-600 hover:bg-red-50/60 dark:hover:text-red-400 dark:hover:bg-red-950/30"
                    >
                      27 612 500
                    </a>
                  </div>
                </div>
              </div>

              {coordinates?.email && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                    <Mail className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      Email
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <a href={`mailto:${coordinates.email}`} className="transition-colors hover:text-red-600 dark:hover:text-red-400">
                        {coordinates.email}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {coordinates?.adresse && (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                    <MapPin className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      Adresse
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {coordinates.adresse}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                  <Clock className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    Horaires
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1.5">
                      Lundi
                      <ArrowRight className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={1.75} aria-hidden="true" />
                      Samedi
                    </span>
                    {' : 10 h – 19 h 30'}
                    <br />
                    Dimanche : 14 h – 19 h
                  </p>
                </div>
              </div>
            </div>

            {coordinates?.gelocalisation && (
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <h3 className="font-display uppercase tracking-wide text-sm font-semibold text-gray-900 dark:text-white mb-4">
                  Localisation
                </h3>
                <div
                  className="w-full h-64 rounded-lg overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: coordinates.gelocalisation }}
                />
              </div>
            )}
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet *
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-11 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 rounded-xl"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <Textarea
                  id="message"
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer le message
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
