'use client';

import Image from 'next/image';
import { memo, useCallback, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { notify as toast } from '@/lib/notify';
import { LinkWithLoading } from './LinkWithLoading';
import { useCartActions, useCartQty } from '@/app/contexts/CartContext';
import { getStorageUrl } from '@/services/api';
import { formatTnd, getPriceDisplay, parsePromoDate } from '@/util/productPrice';
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

  const deadline = parsePromoDate(product.promo_expiration_date);

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
    // Keep price, saving, per-product deadline and the full purchase target. The shorter image
    // well and a shared 12px rhythm recover space without reducing product or price typography.
    <article className="pt-plate group relative flex h-full min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-elevated p-4 transition-colors [@media(hover:hover)]:hover:border-brand/50">
      {discount > 0 && (
        <span className="absolute left-6 top-6 z-10 rounded-lg bg-brand px-2 py-1 font-display text-lg font-bold tabular-nums leading-none text-on-brand">−{discount}%</span>
      )}
      <LinkWithLoading
        href={buildProductUrlPath(product)}
        loadingMessage="Chargement du produit"
        className="flex w-full min-w-0 flex-1 flex-col gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="pt-logo-well relative h-40 w-full shrink-0 overflow-hidden rounded-lg">
          {image ? (
            <Image
              src={image}
              alt={buildProductAlt(product, { name })}
              fill
              sizes="(max-width: 639px) 80vw, (max-width: 1279px) 45vw, 320px"
              quality={80}
              loading="lazy"
              className={`object-contain p-4 transition-transform duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-[1.04] ${outOfStock ? 'opacity-45' : ''}`}
            />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-xl font-bold text-ink-3/40" aria-hidden="true">{name.charAt(0)}</span>
          )}
        </div>
        <div className="w-full min-w-0 flex-1">
          <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-ink-1 transition-colors [@media(hover:hover)]:group-hover:text-brand">{name}</h3>
          {outOfStock ? (
            <p className="mt-2 text-xs font-semibold text-ink-3">Rupture de stock</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-2">
                <span className="font-display text-3xl font-extrabold tabular-nums leading-none text-brand">{formatTnd(price.finalPrice)}</span>
                {price.hasPromo && price.oldPrice != null && <span className="text-sm tabular-nums text-ink-3 line-through">{formatTnd(price.oldPrice)}</span>}
                {saved > 0 && <span className="text-sm font-semibold text-ink-1">Économie : <span className="text-brand">{formatTnd(saved)}</span></span>}
              </div>
            </>
          )}
        </div>
      </LinkWithLoading>
      {price.hasPromo && deadline != null && (
        <p className="w-full border-t border-hairline pt-2 text-xs text-ink-2">
          Fin le <time dateTime={new Date(deadline).toISOString()}>{new Date(deadline).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Tunis' })}</time>
        </p>
      )}
      <button
        type="button"
        onClick={handleAdd}
        aria-disabled={outOfStock || atLimit || undefined}
        aria-label={outOfStock ? `${name} — rupture de stock` : atLimit ? `Stock maximum atteint pour ${name}` : `Ajouter ${name} au panier`}
        className={`flex min-h-11 w-full shrink-0 items-center justify-center gap-2 px-3 text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 ${outOfStock || atLimit ? 'cursor-not-allowed bg-sunken text-ink-3' : 'bg-brand text-on-brand [@media(hover:hover)]:hover:bg-brand-hover'}`}
      >
        {justAdded ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingCart className="h-5 w-5" aria-hidden="true" />}
        {outOfStock ? 'Rupture de stock' : atLimit ? 'Stock maximum atteint' : justAdded ? 'Ajouté au panier' : 'Ajouter au panier'}
      </button>
    </article>
  );
});
