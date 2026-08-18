'use client';

import Image from 'next/image';
import { useCart } from '@/app/contexts/CartContext';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, Truck, X, Tag } from 'lucide-react';
import Link from 'next/link';
import { getStorageUrl } from '@/services/api';
import { getStockDisponible } from '@/util/cartStock';
import { getPriceDisplay } from '@/util/productPrice';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nProvider';
import { localizedName } from '@/i18n/content';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { locale, formatCurrency } = useI18n();
  const {
    items,
    removeFromCart,
    updateQuantity,
    getTotalPrice,
    getEffectivePrice,
  } = useCart();

  const totalPrice = getTotalPrice();

  /*
    ── WHAT THE BASKET SAVED, WHICH THE DRAWER NEVER SAID ────────────────────────────────────
    Owner, 18/08/2026: *"redesign the panier, make it more pro — check the panier of Impact"*.

    The clearest thing that cart does and this one did not is state the DISCOUNT. Every row there
    reads `185 TND  148 TND` with a `20% OFF applied` tag under it, and the panel totals the reward
    it is earning. Ours knew every one of those numbers — `getPriceDisplay` returns `oldPrice` and
    `hasPromo` and is what the cards, the product page and the bundle builder all print — and threw
    them away at the one screen where a shopper is deciding whether to go through with it.

    So: the struck original and a −N% chip per line, and one line in the footer for the total. No
    invented urgency, no fake anchor; these are the same two numbers already printed on the card
    the item was added from, carried through to the basket.
  */
  const savings = items.reduce((sum, item) => {
    const { finalPrice, oldPrice, hasPromo } = getPriceDisplay(item.product as never);
    if (!hasPromo || oldPrice == null || oldPrice <= finalPrice) return sum;
    return sum + (oldPrice - finalPrice) * item.quantity;
  }, 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      {/*
        ── THE TRANSPARENT STRIP AT THE BOTTOM ────────────────────────────────────────────────
        Owner, 18/08/2026: *"redesign the panier also — you can see a transparent bottom"*.

        `max-h-[96dvh]` was the cause, and it is a genuinely non-obvious one. The drawer primitive
        gives a right-hand panel `inset-y-0`, i.e. top:0 AND bottom:0, which resolves its height to
        the full viewport. Adding a max-height over-constrains that box, and CSS resolves an
        over-constrained absolutely-positioned element by keeping `top` and ignoring `bottom` — so
        the panel became 96dvh tall, anchored to the top, and the remaining 4% of the screen was
        the page showing through under it. On a 1080px screen that is a 43px band of the homepage
        below the cart, which is exactly what the owner photographed.

        A side drawer has no reason to be short. `h-full` states the intent the primitive already
        had, and nothing caps it.

        `shadow-none` went with it. The primitive ships `-8px 0 24px rgba(0,0,0,.12)` for this
        direction and it is the only thing separating a white panel from a white page at the seam;
        overriding it to none is why the drawer's left edge disappeared wherever the page behind
        it was also white.

        ── THE WIDTH, AND WHY IT NEEDS `!` ───────────────────────────────────────────────────
        The primitive sets `data-[vaul-drawer-direction=right]:w-3/4`, which is an attribute-scoped
        selector and therefore beats a plain `w-full` in the cascade — and tailwind-merge cannot
        collapse the pair either, because the two classes have different keys. So a phone got a
        cart 292px wide out of 390, and every product name in it clipped mid-word
        ("NITROTECH WHEY PROTEI…"). `!w-[min(28rem,…)]` is the same escape hatch the mobile menu
        Sheet already uses for the same reason, three files over.

        `min(28rem, 100vw - 2.5rem)`: 350px on a 390px phone, which is +58px of name and keeps 40px
        of backdrop so the drawer still reads as an overlay you can tap out of rather than a new
        page.

        ── AND IT WAS STILL NEVER 448 ON A DESKTOP (measured, second pass) ───────────────────
        That `!w-` was written to make the panel 448px wide, and `measure-cart.mjs` says it rendered
        at 384. The primitive also ships
        `data-[vaul-drawer-direction=right]:sm:max-w-sm` — a 384px CEILING, on an attribute-scoped
        selector, in a different property from the one that was overridden. Width and max-width do
        not collapse in tailwind-merge either, so the `!w-` won its own fight and lost the war.

        `!max-w-[28rem]` lifts the ceiling to the same 448. On a 1536 screen that is a basket wide
        enough for a two-line product name beside a 68px packshot without either wrapping.

        `!border-l-hairline` replaces the primitive's `border-gray-200 / dark:border-gray-700` on
        the one edge of this panel that touches the page. Two raw palette values where the token
        layer already has the answer, and the dark half was a guess.
      */}
      <DrawerContent className="flex h-full !w-[min(28rem,calc(100vw-2.5rem))] !max-w-[28rem] flex-col !border-l-hairline bg-elevated">
        <DrawerHeader className="shrink-0 gap-0 border-b border-hairline bg-elevated px-5 pb-3 pt-4">
          {/*
            ── A COUNT, AND A WAY OUT ──────────────────────────────────────────────────────────
            The reference cart puts a bag, a title and a count badge on one line and an X on the
            other end. Ours had the title alone, and NO CLOSE CONTROL AT ALL: the only ways out
            were tapping the backdrop or pressing Escape, neither of which is discoverable, and on
            a phone the backdrop is a 40px strip down one edge. That is a usability defect rather
            than a styling one, which is why it leads.
          */}
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle className="flex items-center gap-2.5 font-display font-compressed text-2xl font-extrabold uppercase tracking-tight text-ink-1">
              <ShoppingBag className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
              Panier
              {items.length > 0 && (
                <span className="rounded-full bg-brand px-2 py-0.5 font-sans text-[11px] font-bold leading-normal tabular-nums text-on-brand">
                  {items.length}
                </span>
              )}
            </DrawerTitle>
            <DrawerClose
              className="-me-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-ink-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              aria-label="Fermer le panier"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DrawerClose>
          </div>
          {/* "Votre panier est vide" was printed TWICE on an empty cart — once here and once in
              the empty state a few lines below, one directly under the other, in a drawer that
              had nothing else in it. The empty state is the better home for it: it has the icon,
              the explanation and the way out. Then "2 articles dans votre panier" was printed
              under a header that ALREADY carries a `2` badge two inches to the left - 24px of
              subtitle restating a number the eye has just read, on the one panel the owner is
              asking to stop eating height.

              So it is sr-only in both states. Radix warns when a titled dialog has no
              description, and a screen-reader user genuinely does need the count announced on
              open because they cannot see the badge. Sighted users lose nothing. */}
          <DrawerDescription className="sr-only">
            {items.length === 0
              ? 'Votre panier est vide'
              : `${items.length} article${items.length > 1 ? 's' : ''} dans votre panier`}
          </DrawerDescription>
        </DrawerHeader>

        {/* `h-full` on the scroller is what lets the empty state centre itself in it — see below. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-elevated px-5">
          {items.length === 0 ? (
            /* An empty drawer is a dead end unless it points somewhere. This one showed a box,
               one flat sentence, and a button — and that sentence was already in the header
               immediately above it. It now carries a headline in the display face, one line
               saying what to do, and the free-delivery threshold, which is the most persuasive
               fact this shop has and the actual reason to start adding things. */
            /* CENTRED IN THE PANEL, not stacked at the top of it. `py-12` put the icon 48px
               under the header and left roughly 600px of empty white below the button — the
               "fix the content and how it shows inside" half of the same note. `h-full` +
               `justify-center` makes the drawer's one message sit in the middle of the space it
               has, which is what an empty state is for. */
            <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-hairline bg-sunken">
                <ShoppingBag className="h-9 w-9 text-brand" aria-hidden="true" />
              </div>
              <p className="font-display font-compressed text-xl font-extrabold uppercase tracking-tight text-ink-1">
                Votre panier est vide
              </p>
              <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-ink-3">
                Ajoutez vos produits et profitez de la livraison gratuite dès 300 DT partout en Tunisie.
              </p>
              <DrawerClose asChild>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="mt-6 h-12 w-full max-w-xs rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand hover:bg-brand-hover"
                >
                  Continuer les achats
                </Button>
              </DrawerClose>
            </div>
          ) : (
            <div className="space-y-2.5 py-4">
              {items.map(item => {
                const displayPrice = getEffectivePrice(item.product);
                const { oldPrice, hasPromo } = getPriceDisplay(item.product as never);
                const struck = hasPromo && oldPrice != null && oldPrice > displayPrice ? oldPrice : null;
                const percent = struck ? Math.round(((struck - displayPrice) / struck) * 100) : 0;
                const stockDisponible = getStockDisponible(item.product as any);
                const maxQty = Math.max(1, stockDisponible);
                /* THE BRAND, BUT ONLY WHEN THE NAME DOES NOT ALREADY CARRY IT. Half this catalogue
                   is named "BIG WHEY 2KG - BIG RAMY LABS", and a brand line above that is the same
                   words twice in a 44px stack — the exact noise this pass is removing elsewhere.
                   Normalised on both sides because the DB has "BIG RAMY" against "Big Ramy Labs". */
                const rawBrand = (item.product as any).brand?.designation_fr as string | undefined;
                const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '');
                const productName = localizedName(item.product as any, locale);
                const brand =
                  rawBrand && !norm(productName).includes(norm(rawBrand)) ? rawBrand : undefined;
                /* Only when it is genuinely scarce. A permanent "en stock" badge on every line is
                   decoration; "plus que 2" is the one stock fact that changes what somebody does,
                   and it is the same limit the stepper is about to enforce silently anyway. */
                const lowStock = stockDisponible > 0 && stockDisponible <= 5;

                const handleIncrease = () => {
                  const next = item.quantity + 1;
                  if (next > stockDisponible) {
                    updateQuantity(item.product.id, maxQty);
                    toast.info('Quantité ajustée au stock disponible.');
                  } else {
                    updateQuantity(item.product.id, next);
                  }
                };

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-xl border border-hairline bg-elevated p-2.5 transition-colors hover:border-rule"
                  >
                    {/* `bg-elevated` row on a `bg-elevated` panel, separated by its hairline —
                        and the THUMBNAIL is the well. It was the other way round: a `bg-sunken`
                        row holding a `bg-elevated` thumbnail, which reads as a card floating on a
                        card and gives the packshot the brightest surface in the drawer for no
                        reason. The product photograph is the thing that should recede into a well;
                        the price and the controls are what should sit on the plate. */}
                    <div className="relative h-[68px] w-[68px] flex-shrink-0 self-start overflow-hidden rounded-lg bg-sunken">
                      {(item.product as any).image || (item.product as any).cover ? (
                        <Image
                          src={(item.product as any).image || ((item.product as any).cover ? getStorageUrl((item.product as any).cover) : '')}
                          alt={localizedName(item.product as any, locale, 'Product')}
                          fill
                          className="object-contain p-1.5"
                          sizes="68px"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-ink-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* THE BRAND, which is how people actually name what they bought - "the
                              Big Ramy whey", not "BIG WHEY 2KG - BIG RAMY LABS". It is on the card
                              the item was added from and on the product page it came from, and the
                              basket was the one screen that dropped it. 11px caps in ink-3, so it
                              labels the name rather than competing with it. */}
                          {brand && (
                            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                              {brand}
                            </p>
                          )}
                          <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink-1">
                            {productName}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-1 -mt-1 h-8 w-8 shrink-0 rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                          aria-label="Retirer du panier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* THE UNIT PRICE, ITS ORIGINAL, AND THE SAVING — one line, in that reading
                          order, which is the order the reference uses and the order the same three
                          numbers already appear in on the product card this item came from. */}
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        <span className="font-display text-sm font-bold tabular-nums tracking-tight text-brand">
                          {formatCurrency(displayPrice)}
                        </span>
                        {struck != null && (
                          <>
                            <span className="text-xs tabular-nums text-ink-3 line-through">
                              {formatCurrency(struck)}
                            </span>
                            {percent > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-1.5 py-px text-[11px] font-semibold tabular-nums text-ok">
                                <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                                −{percent}%
                              </span>
                            )}
                          </>
                        )}
                      </p>
                      {lowStock && (
                        <p className="mt-1 text-[11px] font-medium tabular-nums text-warn">
                          Plus que {stockDisponible} en stock
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {/* The stepper is the WELL now that the row is a plate — the same swap as
                            the thumbnail above, and for the same reason: a control that is pressed
                            reads as recessed. */}
                        <div className="flex items-center overflow-hidden rounded-lg border border-hairline bg-sunken">
                          <button
                            type="button"
                            className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center text-ink-2 transition-colors hover:bg-elevated hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                            onClick={() =>
                              updateQuantity(item.product.id, Math.max(1, item.quantity - 1))
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums text-ink-1" aria-live="polite">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center text-ink-2 transition-colors hover:bg-elevated hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                            onClick={handleIncrease}
                            disabled={item.quantity >= maxQty}
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        {/* The LINE total, which is only worth printing when it DIFFERS from the
                            unit price 40px above it. At quantity 1 it was the same number twice on
                            one small card: the reader checks whether the two disagree, finds they
                            never do, and learns to skip both. Above 1 it is the number that
                            actually matters, so it is shown with the multiplication that produced
                            it - which is also the arithmetic somebody does in their head before
                            they trust a basket total. */}
                        {item.quantity > 1 && (
                          <p className="text-right">
                            <span className="block text-[11px] leading-none tabular-nums text-ink-3">
                              {item.quantity} × {formatCurrency(displayPrice)}
                            </span>
                            <span className="mt-1 block font-display text-[15px] font-bold leading-none tabular-nums tracking-tight text-ink-1">
                              {formatCurrency(displayPrice * item.quantity)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="shrink-0 gap-0 border-t border-hairline bg-elevated px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5">
            {/*
              -- WHY THE FOOTER WAS EATING A THIRD OF THE PANEL ---------------------------------
              Owner, 18/08/2026: *"the bottom of it - why eating all of that height!"*.

              Measured on the screenshot: ~330px of a ~900px drawer, for four facts and two links.
              None of it was one large thing; it was six small ones compounding.

                - `DrawerFooter` ships `gap-2`, and every block ALSO carried its own `mb-4`. Every
                  seam in here was therefore 24px, not 16 - the two spacing systems added up
                  instead of one overriding the other. `gap-0` makes the margins the only authority.
                - The delivery notice was a bordered, filled, `p-3` CARD. A card is what you draw
                  around something a reader must be able to find later; this is a single sentence
                  that is read once, and boxing it cost 26px of chrome around 20px of text.
                - `p-5` all round, plus a 20px bottom that then had `env(safe-area-inset-bottom)`
                  added on top of it on a phone.
                - "Voir le panier" sat in its own centring wrapper with `py-2.5`.

              Now: one 20px line for delivery, a hairline, the money, the button, the link. ~215px
              on the same content, which is ~115px given back to the product rows - close to one
              whole extra item visible without scrolling, on the panel where scrolling past your own
              items is how a basket gets abandoned.
            */}
            {totalPrice < 300 ? (
              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-2 text-[13px] leading-tight text-ink-2">
                  <Truck className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <span>
                    Plus que{' '}
                    <span className="font-bold tabular-nums text-ink-1">{formatCurrency(300 - totalPrice)}</span>
                    {' '}pour la <span className="font-semibold text-brand">livraison gratuite</span>
                  </span>
                </p>
                {/* The bar stays - it is the one element here that says something the sentence
                    does not, which is HOW CLOSE you are. 4px instead of 6. */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-300"
                    style={{ width: `${Math.min(100, (totalPrice / 300) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              /* `text-ok`, not `green-700` with a hand-written `dark:` twin beside it. `--c-ok` is
                 5.02:1 on canvas in light and 8.45:1 on the slab in dark, measured, in one class. */
              <p className="mb-3 flex items-center gap-2 text-[13px] font-medium leading-tight text-ok">
                <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
                Livraison gratuite incluse
              </p>
            )}

            {/* One rule above the money, because the total is the only line in this panel that
                summarises the ones above it. Without it the footer is three unrelated blocks of
                the same weight and the eye has to hunt for the number it came for. */}
            <div className="border-t border-hairline pt-3">
              {savings > 0 && (
                /* The reference cart totals its reward points here; this totals the thing this
                   shop actually gives, which is the discount already inside the prices above. It
                   renders only when there IS one - a permanent "vous economisez 0 DT" is noise. */
                <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <Tag className="h-3.5 w-3.5 shrink-0 text-ok" aria-hidden="true" />
                    Vous économisez
                  </span>
                  <span className="font-semibold tabular-nums text-ok">{formatCurrency(savings)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-[15px] font-semibold uppercase tracking-wide text-ink-1">
                  Total
                </span>
                <span className="font-display text-2xl font-extrabold leading-none tabular-nums tracking-tight text-brand">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            <DrawerClose asChild>
              <Link href="/checkout" className="mt-3 block">
                <Button className="h-12 w-full rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover">
                  Passer commande
                </Button>
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              {/* 34px tall, down from 40. Still well clear of the 24px minimum SC 2.5.8 asks of a
                  target that is not the primary action, and it is directly under a 48px button
                  that does the same job better - this link is the escape hatch, not the path. */}
              <Link
                href="/cart"
                className="mt-1 block rounded-lg py-2 text-center text-[13px] font-medium text-ink-2 transition-colors hover:text-brand"
              >
                Voir le panier
              </Link>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
