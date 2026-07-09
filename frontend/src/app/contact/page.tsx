import { Metadata } from 'next';
import { buildCanonicalUrl } from '@/util/canonical';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  // `absolute` so the layout template doesn't append a 2nd " | Protéine Tunisie".
  title: { absolute: 'Contact – Protéine Tunisie, Sousse | Compléments & Whey' },
  description: 'Nous contacter à Sousse : adresse, téléphone, email. Questions sur nos protéines, créatine et compléments en Tunisie.',
  alternates: { canonical: buildCanonicalUrl('/contact') },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
