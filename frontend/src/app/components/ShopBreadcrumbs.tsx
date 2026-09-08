import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb';

interface BreadcrumbItemData {
  label: string;
  href?: string;
}

interface ShopBreadcrumbsProps {
  items: BreadcrumbItemData[];
}

/**
 * ── ONE CLASS STRING FOR A BREADCRUMB LINK ───────────────────────────────────────────────────
 * `check-tap-targets` at 320 and 390 measured these at 16–20px tall on /creatine and on every
 * product page — the shortest interactive elements on the phone site. They are ordinary inline
 * links in a 14px row, so the box IS the line height; nothing about the row was wrong.
 *
 * `-my-3.5 py-3.5` is the codebase's existing answer to exactly that (FrequentlyBoughtTogether's
 * product name, the buy column's brand link, the PDP's "Retour"): 28px of padding takes the box
 * to 44 and the negative margin hands the same 28 straight back, so the crumb row keeps its
 * height to the pixel and the target clears the floor. The margins are vertical only, so the
 * horizontal `gap-1.5` between crumbs is untouched.
 *
 * 3.5 rather than 3, and that is a measurement not a preference: `py-3` reached 44 on the
 * category rail (a 20px line box) and stopped at 40 on the product page (16px). The floor has to
 * hold on the shorter of the two.
 *
 * `hover:text-brand` replaces `hover:text-red-600 dark:hover:text-red-400` — one theme-aware token
 * instead of a manual dark pair of the legacy `red` alias — and `ring-focus` replaces the
 * browser's default outline, which was all a keyboard user got here.
 */
const CRUMB_LINK =
  '-my-3.5 inline-flex items-center gap-1 py-3.5 rounded-md transition-colors hover:text-brand ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus';

export function ShopBreadcrumbs({ items }: ShopBreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-4 sm:mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className={CRUMB_LINK}>
              <Home className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Accueil</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((item, index) => (
          <div key={index} className="flex items-center min-w-0">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem className="min-w-0">
              {item.href && index < items.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className={CRUMB_LINK}>
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate max-w-[60vw] sm:max-w-none">{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
