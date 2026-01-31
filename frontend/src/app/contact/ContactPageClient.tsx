'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Phone, Mail, MapPin, Clock, Send, Loader2 } from 'lucide-react';
import { ScrollToTop } from '@/app/components/ScrollToTop';
import { motion } from 'motion/react';
import { sendContact, getCoordinates } from '@/services/api';
import { toast } from 'sonner';

export default function ContactPageClient() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordinates, setCoordinates] = useState<any>(null);

  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const data = await getCoordinates();
        setCoordinates(data);
      } catch (error) {
        console.error('Error fetching coordinates:', error);
      }
    };
    fetchCoordinates();
  }, []);

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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Contactez-nous
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Nous sommes là pour répondre à toutes vos questions
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
              {coordinates?.phone && (
                <div className="flex items-start space-x-4 mb-6">
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Téléphone
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <a href={`tel:${coordinates.phone}`} className="hover:text-red-600 dark:hover:text-red-400">
                        {coordinates.phone}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {coordinates?.email && (
                <div className="flex items-start space-x-4 mb-6">
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Email
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      <a href={`mailto:${coordinates.email}`} className="hover:text-red-600 dark:hover:text-red-400">
                        {coordinates.email}
                      </a>
                    </p>
                  </div>
                </div>
              )}

              {coordinates?.adresse && (
                <div className="flex items-start space-x-4 mb-6">
                  <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                    <MapPin className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Adresse
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {coordinates.adresse}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-4">
                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    Horaires
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Lun - Sam: 9h00 - 19h00
                  </p>
                </div>
              </div>
            </div>

            {coordinates?.gelocalisation && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
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
            <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom complet *
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  required
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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
