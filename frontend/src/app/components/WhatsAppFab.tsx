'use client';

import { usePathname } from 'next/navigation';
import { buildWhatsAppHref, WHATSAPP_ARIA_LABEL, WHATSAPP_ICON_PATH } from '@/util/whatsapp';

/**
 * Site-wide floating WhatsApp button.
 *
 * WhatsApp is the dominant ordering / trust channel for Tunisian COD shoppers, so this is a real
 * conversion surface, not decoration.
 *
 * REDESIGNED alongside the hero. What changed and why:
 *  - 48→56px from `sm` up, with a brand-green shadow, so it reads as a deliberate control rather
 *    than a stray dot. 48px stays on phones, where screen space is the scarcer resource.
 *  - It expands to a labelled pill ("Commander sur WhatsApp") from `lg` up. An unlabelled green
 *    circle is only obvious to people who already know the convention; the label removes that
 *    guess on the widths that have room for it, and stays collapsed on phones where it would
 *    crowd the thumb zone beside the tab bar.
 *  - Raised clear of the hero's new prev/next arrows, which sit vertically centred on the right
 *    edge — at the old offset the two visually collided on short laptop viewports.
 *  - z-40 keeps it under the header (z-50) and level with the tab bar, exactly as before.
 *
 * Deliberately hidden on checkout/cart/confirmation, where a sticky purchase CTA and the checkout
 * footer already own the bottom of the screen (avoids the CTA-overlap problem).
 */

/**
 * Routes where a sticky purchase CTA already owns the bottom of the screen.
 *
 * `/pack-builder` joined this list on 2026-08-04 for exactly the same reason as checkout, and with
 * a measurement behind it: `scripts/measure-packbuilder.mjs` found **30.2% of an iPhone 13 screen —
 * 39.9% of a 360x566 Android — covered by fixed chrome**, five layers of it, with this bubble and
 * the back-to-top button sitting directly ON TOP of the product grid rather than beside it. Owner:
 * "the screen on the mobile looks so filled… take it off."
 *
 * The channel is MOVED, not removed. WhatsApp now has a row in the mobile menu (HeaderClient), which
 * it never had before — so every page still offers it, from the place people look for a way to
 * contact a shop. Deleting the only mobile affordance for the dominant ordering channel in Tunisia
 * would have been a conversion bug dressed up as a layout fix.
 */
const HIDDEN_ON = ['/checkout', '/cart', '/order-confirmation', '/pack-builder'];

export function WhatsAppFab() {
  const pathname = usePathname() || '/';
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const href = buildWhatsAppHref();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_ARIA_LABEL}
      className={[
        // Position. The bottom offset clears the mobile tab bar (--tabbar-h is 0 above 768px) and
        // rises further when the install banner is showing.
        // md:hidden — WhatsApp now lives in the desktop nav beside the pack CTA. Two persistent
        // WhatsApp buttons on one screen is one too many, and the corner bubble is the weaker of
        // the two on desktop: far from the moment of hesitation and competing with the cart.
        'md:hidden',
        'fixed right-3 z-40 sm:right-5',
        'bottom-[calc(1rem+var(--tabbar-h))] sm:bottom-[calc(1.75rem+var(--tabbar-h))]',
        'max-md:[body[data-install-banner]_&]:bottom-[calc(5.5rem+var(--tabbar-h))]',
        // Shape: circle on phones, labelled pill from lg.
        'group flex items-center justify-center gap-2.5 rounded-full',
        'h-14 w-14',
        // Colour + depth. The green shadow keeps it legible on both light and dark pages.
        'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 ring-1 ring-black/5',
        'transition-[transform,box-shadow,background-color] duration-200',
        'hover:bg-[#1FB855] hover:shadow-xl hover:shadow-[#25D366]/40 hover:-translate-y-0.5',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      ].join(' ')}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="currentColor" aria-hidden="true">
        <path d={WHATSAPP_ICON_PATH} />
      </svg>
    </a>
  );
}
