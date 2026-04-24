import { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact – Proteine Tunisie Sousse | Protéines & Compléments',
  description: 'Nous contacter à Sousse. Adresse, téléphone, email. Questions sur nos protéines et compléments en Tunisie.',
};

export default function ContactPage() {
  return <ContactPageClient />;
}
