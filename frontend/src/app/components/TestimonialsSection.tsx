import Image from 'next/image';
import { Star, Quote } from 'lucide-react';
import { SectionHeader } from '@/app/components/SectionHeader';

const testimonials = [
  {
    id: 1,
    name: 'Ahmed Ben Ali',
    role: 'Athlète professionnel',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop',
    rating: 5,
    text: 'Excellent service et produits de qualité supérieure. La livraison est rapide et les prix sont compétitifs. Je recommande vivement Proteine Tunisie!'
  },
  {
    id: 2,
    name: 'Mariem Trabelsi',
    role: 'Coach fitness',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    rating: 5,
    text: 'Une équipe professionnelle et des produits authentiques. Proteine Tunisie est devenu mon fournisseur principal pour tous mes compléments alimentaires.'
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
    <section className="py-12 sm:py-16 lg:py-20 bg-white dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          kicker="Témoignages"
          title="Témoignages Clients"
          subtitle="Ce que nos clients disent de nous"
        />

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="relative bg-gray-50 dark:bg-gray-900 rounded-xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 text-red-600/10 dark:text-red-500/10">
                <Quote className="h-12 w-12" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-red-500 text-red-500" />
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                &ldquo;{testimonial.text}&rdquo;
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
                  <h3 className="font-display uppercase tracking-wide font-semibold text-gray-900 dark:text-white text-lg">
                    {testimonial.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
