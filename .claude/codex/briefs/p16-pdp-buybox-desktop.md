# Phase 16 — the PDP buy box on desktop: one long stack of full-width rows

## What the owner sent

A desktop screenshot of the product buy box, with:

> *"in the product page, as you see now this is the view of the components on desktop that holds the
> price and protinas etc. I want better organise on the desktop. On desktop let's put the protinas
> simpler on the top right, and polish the rest."*

## What the screenshot shows, top to bottom, every row full width

1. `279 DT` · `350 DT` struck · `-20%` pill
2. `Vous économisez 71.00 DT`
3. **the Protinas block** — a tinted, bordered box with a large coin icon: `Gagnez 279 Protinas · 13.95 DT`
4. `# RÉFÉRENCE 854530005697` pill
5. `En stock`
6. `Arôme` label + a select
7. `Quantité` stepper, with `Total 279.00 DT` pushed to the far right
8. `AJOUTER AU PANIER` (filled)
9. `COMMANDER MAINTENANT` (outlined)
10. `COMMANDER SUR WHATSAPP` (outlined)
11. `Ajouter aux favoris` | `Partager` (two half-width buttons)
12. a four-up trust strip: Livraison / Paiement / Authenticité / Conseil

Twelve stacked full-width rows in one narrow column. Nothing is grouped, everything has equal
visual weight, and the Protinas box — a secondary reward, not a decision input — is the single
heaviest element on the screen, sitting between the price and the reference.

## The job

**Desktop only.** The two explicit asks, plus judgement:

1. **Protinas: top right, simpler.** Move it beside the price block rather than under it, and make
   it lighter — it is a nice-to-have, not a purchase decision. It should read as an annotation on
   the price, not as a panel competing with it. Keep the number and the DT value truthful and keep
   the mark visible (the owner asked for a bigger mark on 08/09 and got 56px — do not shrink it
   back below what it is now unless the new position genuinely demands it, and say so if it does).
2. **Group the rest.** Twelve equal rows is the actual problem. Decide the grouping and defend it —
   a reasonable shape, which you may beat: price + Protinas + saving as one header block; stock,
   reference and arôme as product facts; quantity + total + the CTAs as the action block; the trust
   strip as a footer. Use whitespace and a rule where a group ends, not a box around everything.
3. **The CTA stack is three full-width buttons.** Ask whether all three need equal width and weight
   on desktop. `AJOUTER AU PANIER` is primary; `COMMANDER MAINTENANT` and `COMMANDER SUR WHATSAPP`
   are alternate paths. Do not remove any of them — WhatsApp ordering is real business here — but
   they do not all have to shout.

## Constraints that are not negotiable

- **Mobile must not change.** Report its height before and after and show they match. This
  component renders SEPARATE mobile and desktop blocks — the file's own comment at ~line 816
  records that `ProductIdentifiers` had to be called twice for exactly this reason. Find both, and
  be certain which one you are editing. A change that "works" because you edited the shared block
  is a mobile regression.
- **Every number stays real**: 279 DT and 350 DT come from `prix`/`promo` via `getPriceDisplay`,
  −20% and the 71.00 DT saving are derived from them, `Gagnez 279 Protinas · 13.95 DT` comes from
  `LoyaltyEarnLine`/`pointsToDt`, and the reference is the product's own GTIN. Do not hardcode,
  round for looks, or drop a number to save space. If a number goes it is because it was duplicated
  on screen, and you say so.
- **`ProductDetailClient.tsx` IS in `design-baseline.json`.** It carries known violations. You must
  not add a NEW rule id to it — the ratchet fails on that even for an already-dirty file. Check
  with `npm run lint:design -- --report src/app/(shop)/products/[id]/ProductDetailClient.tsx`
  before and after.
- ≥44px hit targets, French copy, tokens only, no `backdrop-blur` (DS009).
- Do not touch the review composer entry row, `reviews/*`, `avis/*`, `loyalty/Protina.tsx`'s own
  sizes, `QuickOrderDrawer.tsx` or `api/quick-order/route.ts` — all carry work shipped today.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first, then the buy-box region of
   `src/app/(shop)/products/[id]/ProductDetailClient.tsx` (2,801 lines — the buy box starts around
   line 1060) INCLUDING its comments. Several things that look like duplication are recorded
   decisions.
2. Measure at **390, 768, 1024, 1440 and 1920**, both themes: buy-box height, and the y-position of
   `AJOUTER AU PANIER` — the primary CTA moving further down the page would make this worse, not
   better.
3. Verify on a product that is IN STOCK and has a promo, so every element in the screenshot is
   present. The screenshot's product shows 279/350 DT, −20%, "En stock", an Arôme select and a
   GTIN — pick one like that, and name it in your report.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p16 npm run build   # a dist dir that does not exist yet
```

**Build into a directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled output
earlier today and made a correct fix look broken for half an hour. Also note: the flash-section
measuring harness in `output/phase10/clock.cjs` only pins `Date.now` under `next dev` — irrelevant
here unless you reuse it, but do not.

Report: buy-box height and primary-CTA y-position at all five widths before and after, proof mobile
is unchanged, the grouping you chose and why, and every number still displayed with its source.
