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
import { Minus, Plus, Trash2, ShoppingBag, Truck, X, Tag, ArrowRight, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { getStorageUrl } from '@/services/api';
import { getStockDisponible } from '@/util/cartStock';
import { getPriceDisplay } from '@/util/productPrice';
import { useScrollLock } from '@/util/useScrollLock';
import { notify as toast } from '@/lib/notify';
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

  /* The page behind this panel must not move. Vaul locks `body`; this page's scroller is the
     root element, so the lock had no effect on desktop — measured, 0 -> 580px with the cart open.
     See useScrollLock. */
  useScrollLock(open);

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

        ── AND ON A PHONE IT IS THE WHOLE SCREEN (owner, 18/08/2026) ─────────────────────────
        *"on the mobile make it go full width"*.

        It was `min(28rem, 100vw - 2.5rem)` = 350 of 390, keeping 40px of backdrop so the panel
        read as an overlay you could tap out of. That reasoning was sound and the owner has
        overruled it, correctly: the cart on a phone is not a peek at something behind it, it is
        the checkout step, and 40px of dimmed homepage costs a tenth of the row width for a
        dismissal gesture that the X in the header already provides — plus swipe-to-close, which
        vaul gives this drawer for free.

        `100vw` below `sm`, 28rem from there up.

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
      <DrawerContent className="flex h-full !w-full !max-w-none flex-col !border-l-hairline bg-elevated sm:!w-[28rem] sm:!max-w-[28rem]">
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
                  /*
                    -- THE REFERENCE ROW, COLUMN FOR COLUMN (owner, 18/08/2026) ------------------
                    *"redesign the cards in the panier, make them exactly like this layout"*, with
                    a screenshot of a four-row basket.

                    Read off that screenshot, left to right: PACKSHOT, then a text column carrying
                    name / prices / discount, then the STEPPER, then the BIN. Three things change
                    from what we had:

                      1. the stepper moves out of the text column and onto the right edge, on the
                         same baseline as the bin, so every row has its controls in one vertical
                         line down the panel instead of stair-stepping with the text above them;
                      2. the bin leaves the top-right corner and joins them - it was floating
                         beside the name, which put a DESTRUCTIVE control at the end of the
                         reading path for the product title;
                      3. the discount gets its own line under the price rather than a chip wedged
                         beside it. At 448px there was room for `239 DT  280 DT  -15%` on one
                         line; at 350px there was not, and it wrapped.

                    The row is `items-center`: with the controls on the right, a top-aligned
                    packshot left the stepper floating against nothing on a one-line name.
                  */
                  <div
                    key={item.product.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-2.5 rounded-xl border border-hairline bg-elevated p-2.5 transition-colors hover:border-rule sm:flex-nowrap sm:gap-3"
                  >
                    {/* `bg-elevated` row on a `bg-elevated` panel, separated by its hairline —
                        and the THUMBNAIL is the well. It was the other way round: a `bg-sunken`
                        row holding a `bg-elevated` thumbnail, which reads as a card floating on a
                        card and gives the packshot the brightest surface in the drawer for no
                        reason. The product photograph is the thing that should recede into a well;
                        the price and the controls are what should sit on the plate.

                        52px on a phone, 64 on a desktop.

                        -- FOUR COLUMNS IN 350px, WHICH IS THE WHOLE PROBLEM ---------------------
                        The reference row is packshot / text / stepper / bin, and it works because
                        it is being read on a wide panel. On a 390px phone our drawer is 350, and
                        the first attempt at this layout left the text column 122px wide: the price
                        wrapped under the struck original and "-7% appliqué" broke across two lines.
                        Measured rows went from 131px to 170.

                        So every fixed column pays on a phone and gets its size back at `sm`: the
                        packshot 64->52, the gaps 12->8, the stepper buttons 32->28, the bin 32->28,
                        and the two longest strings lose their explanatory halves (below). That is
                        150px of name column instead of 122 - about 17 characters a line, which
                        holds "NITROTECH WHEY" before the break. */}
                    {/* ── AND THEN IT GREW AGAIN (owner, 20/08/2026: "for the panier also make
                        the product images a bit bigger") ──────────────────────────────────────
                        52 -> 68 on a phone, 64 -> 72 from `sm`, and the two steps are different
                        sizes because the two layouts have different money to spend.

                        On a PHONE the row wraps: the stepper and the bin are on their own line
                        (see the note below), so line one is packshot + text and nothing else. At
                        390px that line is 350 - 20 of row padding = 330, so a 68px packshot still
                        leaves a 254px name column - wider than the 150 the four-column desktop
                        row gets. The phone had the most room and was showing the smallest image.

                        From `sm` the row is `flex-nowrap` and all four columns share 388px, so
                        every pixel here comes straight off the name. 72 is +8, which measure-cart
                        confirms still holds "NITROTECH WHEY" on the first line; 80 did not.

                        `p-1` rather than `p-1.5`: the padding is inside the box, so at 52px the
                        6px inset was giving the actual PHOTOGRAPH 40px. Trimming it is 8px more
                        packshot on a phone before the box grows at all. */}
                    <div className="relative h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-lg bg-sunken sm:h-[72px] sm:w-[72px]">
                      {(item.product as any).image || (item.product as any).cover ? (
                        <Image
                          src={(item.product as any).image || ((item.product as any).cover ? getStorageUrl((item.product as any).cover) : '')}
                          alt={localizedName(item.product as any, locale, 'Product')}
                          fill
                          className="object-contain p-1"
                          sizes="(max-width: 639px) 68px, 72px"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-7 w-7 text-ink-3" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/*
                      ── THE CONTROLS DROP TO THEIR OWN LINE ON A PHONE (owner, 18/08/2026) ────
                      *"the cards of the products inside the panier should look more responsive —
                      maybe put the counter adder under the card in a single row"*.

                      Four columns in a 350px drawer was already the tight case (see the note in
                      the git log for the previous pass); at full width it is 390 and the drawer's
                      own padding takes it back to 370. Rather than keep shaving the packshot and
                      the labels, the row WRAPS below `sm`: image + text on line one, and the
                      stepper and the bin on line two, spread across the full width.

                      `basis-full` on the control line is what forces the wrap — everything before
                      it fits on one line, and a full-basis flex item cannot join them. From `sm`
                      the row is `flex-nowrap` and the controls sit back on the right, exactly as
                      the reference has them, because there the width is there to hold them.
                    */}
                    <div className="min-w-0 flex-1">
                      {/* THE BRAND, which is how people actually name what they bought - "the Big
                          Ramy whey", not "BIG WHEY 2KG - BIG RAMY LABS". Printed only when the
                          name does not already carry it (see above). */}
                      {brand && (
                        <p className="truncate text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-ink-3">
                          {brand}
                        </p>
                      )}
                      {/* The reference truncates to ONE line with an ellipsis. Two, clamped, here:
                          our catalogue names carry the size and the brand ("THUNDER GAINER 5.4KG -
                          CHALLENGER NUTRITION") and one line of a ~150px column would cut before
                          the weight, which is the difference between two products on this shelf. */}
                      <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink-1">
                        {productName}
                      </h3>
                      {/*
                        ── THREE LINES BECOME ONE (owner, 18/08/2026) ────────────────────────
                        *"the cards inside the panier — make them more responsive and polished"*.

                        Price, struck original, discount chip and line total were four facts on
                        three separate lines, and that stacking was written when the stepper still
                        shared the row and left the text column ~150px wide. It does not any more:
                        the stepper dropped to its own line in the previous pass, so this column is
                        the full width of the card — 310px on a 390px phone. Four short facts on
                        one baseline fit there with room, and the row comes down 171 -> ~135px.

                        ORIGINAL then CURRENT, which is the order the eye reads as a fall. The
                        line total sits right-aligned at the end, where a total belongs, and only
                        when quantity > 1 — at 1 it is the same number twice on one small card.

                        `text-ok` rather than a raw green: the token is 5.02:1 on canvas in light
                        and 8.45:1 on the slab in dark, measured.
                      */}
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        {struck != null && (
                          <span className="text-[11.5px] tabular-nums text-ink-3 line-through">
                            {formatCurrency(struck)}
                          </span>
                        )}
                        <span className="font-display text-sm font-bold tabular-nums tracking-tight text-brand">
                          {formatCurrency(displayPrice)}
                        </span>
                        {percent > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-ok">
                            <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                            −{percent}%
                          </span>
                        )}
                        {item.quantity > 1 && (
                          <span className="ms-auto text-[11.5px] tabular-nums text-ink-3">
                            {item.quantity} ×{' '}
                            <span className="font-semibold text-ink-1">
                              {formatCurrency(displayPrice * item.quantity)}
                            </span>
                          </span>
                        )}
                      </p>
                      {lowStock && (
                        <p className="mt-1 text-[11px] font-medium leading-tight tabular-nums text-warn">
                          Plus que {stockDisponible} en stock
                        </p>
                      )}
                    </div>

                    {/* The stepper is the WELL now that the row is a plate — a control that gets
                        pressed reads as recessed.

                        On a phone it is on its own line, so the buttons go back UP to 36px square
                        (they had been squeezed to 28 to share a line with the bin) and the whole
                        stepper is `flex-1` — a full-width quantity control is the easiest thing in
                        this drawer to hit and the one most often used. From `sm` it shrinks back
                        to its content and returns to the right-hand column. */}
                    {/* ONE LINE-BOX, which `display: contents` dissolves at `sm`. The first cut
                        put `basis-full` on the stepper alone, and the bin — the next flex item —
                        wrapped again onto a THIRD line: measured rows went 123px -> 217. Wrapping
                        the pair means the phone gets exactly two lines, and `sm:contents` makes
                        the wrapper vanish from the box tree above 640px so the stepper and the bin
                        are direct row items again, as the reference has them. */}
                    <div className="flex w-full items-center gap-2 sm:contents">
                    <div className="flex flex-1 items-center justify-between overflow-hidden rounded-lg border border-hairline bg-sunken sm:flex-none sm:justify-start">
                      <button
                        type="button"
                        className="flex h-9 w-11 items-center justify-center text-ink-2 transition-colors hover:bg-elevated hover:text-brand disabled:pointer-events-none disabled:opacity-40 sm:w-8"
                        onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span
                        className="flex-1 text-center text-[13px] font-semibold tabular-nums text-ink-1 sm:w-6 sm:flex-none"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        className="flex h-9 w-11 items-center justify-center text-ink-2 transition-colors hover:bg-elevated hover:text-brand disabled:pointer-events-none disabled:opacity-40 sm:w-8"
                        onClick={handleIncrease}
                        disabled={item.quantity >= maxQty}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-lg text-ink-3 transition-colors hover:bg-sunken hover:text-destructive sm:w-8"
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label="Retirer du panier"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <DrawerFooter className="shrink-0 gap-0 border-t border-hairline bg-elevated px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-5">
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
            {/* ── SMALLER AGAIN (owner, 18/08/2026, second pass) ─────────────────────────
                *"make the footer of the panier smaller and polished and clean"*. It was 239px of
                an 844px phone — 28% of the panel for four facts and two buttons.

                Every seam in here loses a step (12 -> 8, 12 -> 10), the delivery line goes 13 ->
                12px, the savings merges INTO the total row as a chip beside the label rather than
                a line of its own, and the secondary button comes down to 40px. ~239 -> ~190px,
                and the rows above get all of it. */}
            {totalPrice < 300 ? (
              <div className="mb-2">
                <p className="mb-1.5 flex items-center gap-2 text-[12px] leading-tight text-ink-2">
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
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium leading-tight text-ok">
                <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Livraison gratuite incluse
              </p>
            )}

            {/* One rule above the money, because the total is the only line in this panel that
                summarises the ones above it. Without it the footer is three unrelated blocks of
                the same weight and the eye has to hunt for the number it came for. */}
            <div className="border-t border-hairline pt-2.5">
              {/* THE SAVING RIDES WITH THE TOTAL, not on a line of its own. It is a qualifier on
                  the number beside it — "this is the total, and it is N less than it would have
                  been" — so a separate row was giving a footnote the same weight as the figure it
                  annotates, and 24px of height for the privilege. */}
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-[15px] font-semibold uppercase tracking-wide text-ink-1">
                    Total
                  </span>
                  {savings > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold tabular-nums text-ok">
                      <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
                      −{formatCurrency(savings)}
                    </span>
                  )}
                </span>
                <span className="font-display text-[22px] font-extrabold leading-none tabular-nums tracking-tight text-brand">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>

            {/*
              ── TWO BUTTONS, ONE HIERARCHY (owner, 18/08/2026) ──────────────────────────────
              *"add an icon for the passer commande and make the button voir panier look better,
              like a real button"*.

              It was a filled bar and, under it, a bare centred text link — which reads as a
              footnote rather than as the other thing you can do here, and gave the panel a
              trailing-off bottom edge. Now they are the same shape and the same height, and the
              HIERARCHY is carried by fill versus outline, which is the pair this design system
              already uses everywhere else for primary/secondary.

              The primary keeps its icon on the RIGHT: it moves you forward, and an arrow that
              points the way you are going is the one piece of decoration on this panel that says
              something. The secondary's icon is on the left, where an identifying icon belongs.
            */}
            <DrawerClose asChild>
              <Link
                href="/checkout"
                className="mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-display font-semibold uppercase tracking-wide text-on-brand transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
              >
                Passer commande
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </Link>
            </DrawerClose>
            <DrawerClose asChild>
              <Link
                href="/cart"
                className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rule bg-elevated text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-elevated"
              >
                <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
                Voir le panier
              </Link>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
