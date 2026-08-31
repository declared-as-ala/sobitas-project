'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LinkWithLoading } from '@/app/components/LinkWithLoading';
import { getStorageUrl } from '@/services/api';
import { buildBrandAlt } from '@/util/productAlt';
import type { BrandEntry } from './brandEntries';

/**
 * The logo tier: the ~45 brands that have artwork in the admin AND products behind them.
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
 */
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
                    alt={buildBrandAlt(brand.name)}
                    width={200}
                    height={100}
                    /* The plate is a fixed-height box at every width, so the logo's rendered
                       width is effectively constant — one `sizes` value, no `vw` maths to
                       re-derive when the column count changes, and no extra optimizer variants. */
                    sizes="180px"
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
