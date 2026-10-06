import Link from 'next/link';
import type { BrandFamily } from '@/util/brandCategoryNames';
import { formatTnd } from '@/util/productPrice';

/**
 * « La gamme {Marque} par famille » — one row per product family of the brand, linked to the
 * family's category page, with the counts that family really has on this listing.
 *
 * Every number comes from `copy.families` (built from the same brand listing as the grid), so the
 * row says nothing the cards below do not: « 12 références, dont 3 en stock, dès 129 DT ». The
 * « dès » price is only printed when something in the family is in stock — a starting price on a
 * family that is entirely « Sur commande » is the misleading claim the old brand panel made.
 *
 * The anchor is the family's own name, not categoryAnchor(): this is a list of the brand's ranges,
 * and the curated anchor variety lives on the « Liens utiles » rail below.
 */
export function BrandFamilyIndex({ title, families }: { title: string; families: BrandFamily[] }) {
  const rows = (families ?? []).filter((f) => f && f.name && f.url);
  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="brand-families-heading" className="rounded-2xl border border-hairline bg-elevated p-4 sm:p-6">
      <h2 id="brand-families-heading" className="font-display text-xl font-extrabold uppercase tracking-tight text-ink-1 sm:text-2xl">
        {title}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {rows.map((f) => {
          let facts = ` — ${f.count} référence${f.count > 1 ? 's' : ''}`;
          if (f.inStock > 0) facts += `, dont ${f.inStock} en stock`;
          if (f.inStock > 0 && f.priceMin) facts += `, dès ${formatTnd(f.priceMin)}`;
          return (
            <li key={f.slug} className="min-h-11 border-t border-hairline py-0.5 text-sm leading-snug text-ink-2 sm:text-base">
              <Link
                href={f.url}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded-sm font-semibold text-ink-1 underline-offset-4 transition-colors hover:text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {f.name}
              </Link>
              {facts}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
