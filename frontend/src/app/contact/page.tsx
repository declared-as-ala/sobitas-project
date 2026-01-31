import { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact – SOBITAS Sousse | Protéines & Compléments Tunisie',
  description: 'Nous contacter à Sousse. Adresse, téléphone, email. Questions sur nos protéines et compléments en Tunisie.',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
