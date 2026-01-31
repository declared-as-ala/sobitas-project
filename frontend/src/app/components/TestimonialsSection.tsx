'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Ahmed Ben Ali',
    role: 'Athlète professionnel',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop',
    rating: 5,
    text: 'Excellent service et produits de qualité supérieure. La livraison est rapide et les prix sont compétitifs. Je recommande vivement Protein.tn!'
  },
  {
    id: 2,
    name: 'Mariem Trabelsi',
    role: 'Coach fitness',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    rating: 5,
    text: 'Une équipe professionnelle et des produits authentiques. Protein.tn est devenu mon fournisseur principal pour tous mes compléments alimentaires.'
  },
  {
    id: 3,
    name: 'Karim Messaoudi',
    role: 'Bodybuilder',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    rating: 5,
    text: 'Les meilleurs prix en Tunisie avec une garantie d\'authenticité. Le service client est réactif et toujours prêt à aider.'
  }
];

export function TestimonialsSection() {
  return (
    <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Témoignages Clients
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Ce que nos clients disent de nous
          </motion.p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 text-red-600/10 dark:text-red-500/10">
                <Quote className="h-12 w-12" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full ring-2 ring-red-600 overflow-hidden">
                  <Image
                  src={testimonial.image}
                  alt={testimonial.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                    loading="lazy"
                />
                </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {testimonial.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {testimonial.role}
                      </p>
                    </div>
              </div>

              {/* Decorative Element */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400 rounded-b-2xl" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
