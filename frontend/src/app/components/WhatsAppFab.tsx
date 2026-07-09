'use client';

import { usePathname } from 'next/navigation';

/**
 * Site-wide floating WhatsApp button.
 *
 * WhatsApp is the dominant ordering / trust channel for Tunisian COD shoppers, but the
 * site only exposed it inside the quick-order drawer and the checkout footer. This adds a
 * persistent, thumb-reachable CTA on the pages where questions actually arise (home,
 * listing, product, blog) with a pre-filled French message.
 *
 * Deliberately hidden on checkout/cart/confirmation, where a sticky purchase CTA and the
 * checkout footer already own the bottom of the screen (avoids the CTA-overlap problem).
 */

const WHATSAPP_NUMBER = '21627612500';
const PREFILL_MESSAGE = "Bonjour 👋 J'aimerais des informations / passer commande sur protein.tn.";
const HIDDEN_ON = ['/checkout', '/cart', '/order-confirmation'];

export function WhatsAppFab() {
  const pathname = usePathname() || '/';
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(PREFILL_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Commander ou poser une question sur WhatsApp"
      className="fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 ring-1 ring-black/5 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] motion-reduce:transition-none sm:right-6 sm:bottom-6"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23-1.53 0-3.03-.42-4.33-1.22l-.31-.18-3.12.82.83-3.04-.2-.32a8.18 8.18 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23zm-4.51 4.4c-.19 0-.5.07-.76.35s-1 .98-1 2.38 1.02 2.76 1.17 2.95c.14.19 2.01 3.07 4.86 4.3.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.68-.69 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.11-.26-.18-.54-.32s-1.68-.83-1.94-.92c-.26-.09-.45-.14-.64.14-.19.29-.73.92-.9 1.11-.16.19-.33.21-.61.07-.28-.14-1.18-.44-2.25-1.39-.83-.74-1.39-1.65-1.56-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.17.19-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.62-1.55-.86-2.12-.22-.53-.45-.46-.62-.47-.16-.01-.35-.01-.53-.01z" />
      </svg>
      <span className="sr-only">WhatsApp</span>
    </a>
  );
}
