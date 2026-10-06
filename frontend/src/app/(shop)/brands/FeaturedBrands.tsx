'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getStorageUrl } from '@/services/api';
import { buildBrandAlt } from '@/util/productAlt';
import type { BrandEntry } from './brandEntries';

/**
 * The logo tier: up to 24 of the ~40 brands that have artwork in the admin AND products behind
 * them, in the order page.tsx picks (search demand first — see FEATURED_ORDER).
 *
 * ── WHY `hasLogo` IS THE SELECTION RULE ────────────────────────────────────────────────────
 * The same reasoning the homepage brand strip already runs on. A logo in the admin means someone
 * deliberately onboarded that brand; nobody uploads a wordmark for a row they imported in bulk.
 * Measured 19/08/2026: 57 of 589 brands have one, and the list reads exactly like the shop's real
 * sports-nutrition roster — Optimum Nutrition, BioTech USA, MuscleTech, Dymatize, Nutrex, Redcon1,
 * Universal, Kevin Levrone — while the 532 without are the vitamin import (Swanson, NOW Foods,
 * Nutricost, Solaray).
 *
 * It needs no editorial list to maintain, no new column and no new endpoint, and it degrades
 * safely: if the logos ever vanish from the API this band renders nothing and the A–Z directory
 * below still carries every brand.
 *
 * ── WHY THIS IS A CLIENT COMPONENT FOR ONE PIECE OF STATE ──────────────────────────────────
 * `onError`. A brand logo that 404s in a server component leaves Chrome's broken-image glyph in
 * a 96px plate, and this catalogue has already produced one dead image URL this month (the CMS
 * "Qui sommes-nous" body). One island holding one Set of failed ids is the cost of never showing
 * that; the fallback is the brand name set in the compressed display face, which reads as a
 * deliberate wordmark rather than as a failure.
 *
 * ── ONE URL PER LOGO, AND IT IS THE SAME ONE THE JSON-LD NAMES (05/10/2026) ────────────────
 * The plates went through the image optimizer with `sizes="180px"`, so each <img> carried a
 * 16-entry srcset of `/_next/image?url=…&w=…` variants up to 1920px — about 2.6 KB of HTML per
 * plate for a box that is never more than ~200px wide — and Google Images saw a different URL
 * from the `Brand.logo` in the page's own JSON-LD. `unoptimized` makes `src` exactly
 * `getStorageUrl(logo)`, the protein.tn/media URL the ItemList's Brand nodes already point at:
 * one image, one URL, two signals that agree. The cost is that a plate ships the file as stored.
 * Most admin logos are 2–16 KB WebP, but not all (06/10/2026): Muscle Care is 131 KB at 937×500,
 * William Bonac 77 KB at 1037×1278. The plates lazy-load; the fix for a heavy one is a re-export
 * at ≤400 px in the admin, and `node scripts/audit-brand-copy-live.mjs` lists every logo over
 * 20 KB.
 *
 * The alt is `brand.logoAlt` (brandLogoAlt, resolved on the server) — « Logo Optimum Nutrition »,
 * or a curated override when the admin file is not the wordmark (Big Ramy Labs' is Red Rex).
 * `buildBrandAlt(name)` is the fallback. The previous « {NAME} — marque
 * de compléments alimentaires en Tunisie | Protein.tn » was being quoted by Google as the page's
 * snippet, starting with a gym-equipment brand.
 */

/** The logo well's box: `h-14` tall, and roughly the plate's content width at 2–6 columns. */
const LOGO_BOX_WIDTH = 160;
const LOGO_BOX_HEIGHT = 56;

export function FeaturedBrands({ brands }: { brands: BrandEntry[] }) {
  const [failed, setFailed] = useState<Set<number>>(() => new Set());

  if (brands.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
      {brands.map((brand) => {
        const logoUrl = brand.logo && !failed.has(brand.id) ? getStorageUrl(brand.logo) : null;
        return (
          <li key={brand.id}>
            <LinkWithLoading
              href={`/${brand.slug}`}
              loadingMessage={`Chargement de ${brand.name}…`}
              aria-label={`Voir les produits ${brand.name}`}
              className="pt-plate group flex h-full flex-col items-center justify-between gap-2 rounded-xl border border-hairline px-3 pb-2.5 pt-3 transition-colors duration-200 hover:border-brand/40"
            >
              {/*
                THE WELL EXISTS ONLY WHEN THERE IS ARTWORK IN IT. `.pt-logo-well` is fixed light
                in both themes (see globals.css) because a brand wordmark is black artwork with no
                dark variant — but a theme-aware `text-ink-1` fallback inside a fixed-light box is
                near-white on near-white in dark mode, which is the same bug one layer down. So the
                404 fallback renders on the PLATE, where the tokens are correct.
              */}
              {logoUrl ? (
                <span className="pt-logo-well flex h-14 w-full items-center justify-center rounded-lg px-2">
                  <Image
                    src={logoUrl}
                    alt={brand.logoAlt || buildBrandAlt(brand.name)}
                    width={LOGO_BOX_WIDTH}
                    height={LOGO_BOX_HEIGHT}
                    unoptimized
                    className="max-h-full max-w-[86%] object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading="lazy"
                    onError={() =>
                      setFailed((prev) => {
                        const next = new Set(prev);
                        next.add(brand.id);
                        return next;
                      })
                    }
                  />
                </span>
              ) : (
                <span className="flex h-14 w-full items-center justify-center px-2">
                  <span className="line-clamp-2 text-center font-display font-compressed text-[13px] font-bold uppercase leading-tight tracking-[0.02em] text-ink-1">
                    {brand.name}
                  </span>
                </span>
              )}

              <span className="flex w-full flex-col items-center gap-0.5">
                <span className="line-clamp-1 w-full text-center text-[12px] font-semibold text-ink-1 transition-colors group-hover:text-brand">
                  {brand.name}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] tabular-nums text-ink-3">
                  {brand.count} produit{brand.count > 1 ? 's' : ''}
                  {brand.stock > 0 && (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />
                      <span className="font-semibold text-ok">{brand.stock} en stock</span>
                    </>
                  )}
                </span>
              </span>
            </LinkWithLoading>
          </li>
        );
      })}
    </ul>
  );
}
