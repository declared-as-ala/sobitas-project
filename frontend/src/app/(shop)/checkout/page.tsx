import { Metadata } from 'next';
import CheckoutPage from './CheckoutPage';

export const metadata: Metadata = {
  title: 'Checkout - Finaliser votre commande',
  description: 'Finalisez votre commande en toute sécurité',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Checkout() {
  return <CheckoutPage />;
}
