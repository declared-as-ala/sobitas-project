'use client';

import Image from 'next/image';
import { memo, useCallback, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { LinkWithLoading } from './LinkWithLoading';
import { useCartActions, useCartQty } from '@/app/contexts/CartContext';
import { getStorageUrl } from '@/services/api';
import { getPriceDisplay } from '@/util/productPrice';
import { getStockDisponible } from '@/util/cartStock';
import { buildProductUrlPath } from '@/util/productUrl';
import { buildProductAlt } from '@/util/productAlt';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedName } from '@/i18n/content';
import type { Product } from '@/types';

interface FlashDealProduct extends Product {
  image?: string;
  quantityInStock?: number;
  availableStock?: number;
  force_out_of_stock?: number | boolean;
}

export const FlashDealCard = memo(function FlashDealCard({ product }: { product: FlashDealProduct }) {
  const { locale } = useI18n();
  const { addToCart } = useCartActions();
  const inCartQty = useCartQty(product.id);
  const [justAdded, setJustAdded] = useState(false);
  const name = localizedName(product, locale);
  const price = getPriceDisplay(product);
  const stock = getStockDisponible(product);
  const outOfStock = stock <= 0;
  const atLimit = !outOfStock && inCartQty >= stock;
  const image = product.image || (product.cover ? getStorageUrl(product.cover) : '');
  const saved = price.hasPromo && price.oldPrice != null ? Math.max(0, price.oldPrice - price.finalPrice) : 0;
  const discount = price.hasPromo && price.oldPrice ? Math.round((saved / price.oldPrice) * 100) : 0;

  const handleAdd = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (outOfStock) {
      toast.error('Rupture de stock');
      return;
    }
    if (atLimit) {
      toast.error(`Stock maximum atteint (${stock} disponible${stock > 1 ? 's' : ''}).`);
      return;
    }
    const firstAroma = Array.isArray(product.aromes) ? product.aromes[0] : null;
    addToCart({
      ...product,
      name: product.designation_fr,
      price: price.finalPrice,
      priceText: `${price.finalPrice} DT`,
      image,
      ...(firstAroma ? { selectedAroma: firstAroma } : {}),
    }, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 900);
  }, [addToCart, atLimit, image, outOfStock, price.finalPrice, product, stock]);

  return (
    <article className="pt-plate group relative flex h-full min-w-0 items-center gap-3 rounded-xl border border-hairline bg-elevated p-2.5 transition-colors [@media(hover:hover)]:hover:border-brand/50">
      {discount > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-brand px-2 py-0.5 font-display text-[11px] font-bold tabular-nums text-on-brand">−{discount}%</span>
      )}
      <LinkWithLoading
        href={buildProductUrlPath(product)}
        loadingMessage="Chargement du produit"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="pt-logo-well relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
          {image ? (
            <Image
              src={image}
              alt={buildProductAlt(product, { name })}
              fill
              sizes="80px"
              quality={80}
              loading="lazy"
              className={`object-contain p-1.5 transition-transform duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.04] ${outOfStock ? 'opacity-45' : ''}`}
            />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-xl font-bold text-ink-3/40" aria-hidden="true">{name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-1 transition-colors sm:text-sm [@media(hover:hover)]:group-hover:text-brand">{name}</h3>
          {outOfStock ? (
            <p className="mt-2 text-xs font-semibold text-ink-3">Rupture de stock</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-display text-lg font-extrabold tabular-nums leading-none text-brand">{Math.round(price.finalPrice)} DT</span>
                {price.hasPromo && price.oldPrice != null && <span className="text-xs tabular-nums text-ink-3 line-through">{Math.round(price.oldPrice)} DT</span>}
              </div>
              {saved > 0 && <p className="mt-1 text-[11px] font-semibold text-success">Vous économisez {Math.round(saved)} DT</p>}
            </>
          )}
        </div>
      </LinkWithLoading>
      <button
        type="button"
        onClick={handleAdd}
        aria-disabled={outOfStock || atLimit || undefined}
        aria-label={outOfStock ? `${name} — rupture de stock` : atLimit ? `Stock maximum atteint pour ${name}` : `Ajouter ${name} au panier`}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${outOfStock || atLimit ? 'cursor-not-allowed bg-sunken text-ink-3' : 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'}`}
      >
        {justAdded ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingCart className="h-5 w-5" aria-hidden="true" />}
      </button>
    </article>
  );
});
