# Phase 13 — "Commander maintenant": fewer fields, less text

## What the owner sent

A screenshot of the quick-order sheet on a product page, with:

> *"the popup, make it easier and simpler, take off the extra text, make the field of the name and
> surname as one field full name, and phone number, that's all in the commander maintenant, and make
> it easier for client without extra texts"*

The screenshot shows, above the fold: an eyebrow row, the product line
`THUNDER GAINER 5.4KG - CHALLENGER NUTRITION × 1 — 289.00 DT · Livraison 24–72h`, a quantity
stepper, a flavour select, then **Nom \*** and **Prénom \*** side by side, then **Email \***. The
totals block, three trust lines (`Paiement à la livraison · Livraison 24–72h · Produits
authentiques`), a free-shipping nudge and the confirm button are below. The form is scrolling
inside the sheet — the user cannot see the fields and the button at the same time.

## Do

1. **Merge `Nom` + `Prénom` into ONE required field, "Nom complet".** Keep sending whatever shape
   the API expects — if it wants `nom` and `prenom` separately, split the entered value on the last
   space and send both, and put a comment saying why. Do not change the API contract or the order
   payload to suit the form.
2. **Phone stays required.** It is the only channel that reaches a cash-on-delivery customer.
3. **Email becomes OPTIONAL — do not delete the field.** This one is a deliberate deviation from
   "that's all", and here is the reason, which you should record in a comment: post-delivery review
   requests are sent by email, and a dry run on the live database today reported
   *"Delivered 3–21 days ago, never asked: 3 (1 with a usable email)"* — two of three delivered
   orders had no usable address. Deleting the field guarantees that number gets worse and takes
   product ratings with it. Optional and clearly marked optional costs the customer nothing.
   Remove the `*`, label it as optional in French, and never block submission on it.
4. **Cut the extra text.** The trust lines, the delivery line inside the product summary and any
   other reassurance copy that repeats what the PDP already says are the "extra texts" being
   complained about. Keep at most one short reassurance line. Keep the totals, the free-shipping
   nudge only if it is a real threshold read from config/data, and the button.
5. **Aim for no scrolling on a 390×844 phone**, or as close as the content allows. Report the sheet
   height and whether the confirm button is visible without scrolling at 390 and 1440.

## Don't

- Do not change validation rules that the backend enforces, the API call, the honeypot, or the
  order payload's field names.
- Do not remove the phone or make it optional.
- Do not invent a delivery promise, a stock claim or a free-shipping threshold. If the free-shipping
  line is hardcoded rather than read from data, say so in your report instead of keeping it.
- Do not touch `GoogleReviewsSection.tsx`, `ReviewMarquee.*`, `BrandsSection.tsx`,
  `VentesFlashSection.tsx`, `FlashDealCard.tsx`, `loyalty/*`, the blog route, `layout.tsx`,
  `globals.css` or `content/categories/*.json`.
- No new dependencies, no `backdrop-blur` (DS009). Do not commit, stage or push. **No network.**

## Do first

Read `.claude/skills/protein-ui/SKILL.md`. Then find the component — it is the quick-order / buy-now
sheet reachable from the PDP's primary CTA. Read its existing comments before cutting anything:
several lines in this codebase look like filler and are actually recorded decisions.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p13 npm run build   # a dist dir that does not exist yet
```

**Build into a directory you just created** — a reused one served stale output earlier today.

Report: the field list before and after, the sheet height at 390 and 1440, whether the confirm
button needs scrolling, every line of copy you removed, and how you split the full name for the API.
