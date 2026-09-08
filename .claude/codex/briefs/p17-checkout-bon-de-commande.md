# Phase 17 — checkout polish, its bidi bug, and the "Commande confirmée" print page

Three related things the owner asked for on the checkout flow.

## A. `https://protein.tn/checkout` — polish, and fix the text direction

> *"polish the checkout page and fix the right to left and left to right text in it"*

There is a real bidirectional-text bug to find, not just spacing to tidy. Likely causes, but **measure
before you conclude**: Arabic or mixed Arabic/French strings (product names, addresses, customer
names) rendering in a container with no `dir`, French text with a leading Arabic character flipping
the whole line, phone numbers or prices reversing next to RTL text, or punctuation jumping to the
wrong end of a line.

Relevant history you must read first: `frontend/src/app/globals.css` around line 291 gates the RTL
stylesheet on `html[dir="rtl"]`, and `<html>` is hardcoded `lang="fr"` in `app/layout.tsx` with no
`dir`. Earlier today those RTL rules were re-scoped so the ones that belong to content apply to a
content element that carries its own `dir`, while page-level and drawer/dialog positioning stayed
root-only **on purpose** — a rule that flips the site header because one string is Arabic is a worse
bug than the one being fixed. Follow that same principle here: scope any `dir` you add to the element
that actually holds the bidi text, never to a page-level container.

Use `dir="auto"` on user-supplied strings (names, addresses, notes) rather than guessing a direction,
and isolate them so they cannot reorder their neighbours. Numbers, prices and phone numbers must stay
LTR regardless of surrounding text.

Then polish: spacing rhythm, alignment of the summary against the form, field grouping, and the
mobile layout at 390. Report heights before and after.

## B. The print / "imprimer" page says the wrong thing

> *"same page when I make imprimer I get a page where it says **Commande confirmée** while it should
> just be **bon de commande**, rework the design of it, make it super pro"*

Find what "Imprimer" opens from checkout. It currently presents as an order-confirmation screen; it
must present as a **bon de commande** — a document, not a celebration.

- Change the heading and any confirmation language accordingly. French, no exclamation marks.
- Redesign it as a printable document: clear header with the shop's identity, the order reference and
  date, the customer and delivery block, a line-items table, and a totals block. Look at
  `filament/resources/views/print/*.blade.php` for the house print layout the backend already uses
  for Devis / Ticket / Facture / BL and stay consistent with it — do not invent a second visual
  language for the same company's paperwork.
- It must actually print well: a print stylesheet, no dark backgrounds burning ink, no clipped
  columns, no interactive chrome (nav, buttons, toasts) on paper.
- **Every figure must come from the order data.** Do not hardcode a total, a shipping fee, a discount
  or a tax line. If a value is not available in what the page receives, leave the row out rather than
  printing a zero that reads as a fact.

## C. Constraints

- Read `.claude/skills/protein-ui/SKILL.md` first. Tokens only, French copy, ≥44px targets, no
  `backdrop-blur` (DS009), `Section`/`Container` primitives, and **no new rule id** in any file
  already listed in `design-baseline.json`.
- Do NOT change: the order payload, field names, validation the backend enforces, the honeypot, or
  any API call. `frontend/src/app/api/quick-order/route.ts` and `QuickOrderDrawer.tsx` changed today —
  leave them alone.
- Do NOT touch: `src/util/sitemapSources.ts`, `src/app/sitemaps/**`, `src/lib/notify.ts` or the toast
  renderer, the account/missions components, the pack builder, `util/company.ts`, `util/whatsapp.ts`,
  `util/structuredData.ts`, Footer/Header clients, or `content/categories/*.json`. Four other agents
  are working in those right now and will collide with you.
- The phone number is being corrected site-wide by another task (+216 22 464 315 replaces
  +216 27 612 500). If you see the old number on these pages, **leave it** — do not fix it here or we
  will conflict.

## Verify

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p17 npm run build   # a dist dir that does not exist yet
```

A reused `NEXT_DIST_DIR` served stale compiled output earlier today and made a correct fix look
broken for half an hour. Build into one you just created, then serve it and check the real pages.

Checkout needs a cart to render. `scripts/measure-account.mjs` is the template for a surface behind
state: it seeds `localStorage` with `evaluateOnNewDocument` and intercepts API calls with fixtures,
matching on request PATH (same-origin `/api-proxy/*`, not admin.protein.tn). Read its header first —
it documents three ways a guard here has lied, including one that measured a quantity which could not
express failure.

## Report

The bidi defect you actually found, with the string and the element that caused it; checkout heights
at 390 and 1440 before and after; the print page's heading before and after; where every figure on
the bon de commande comes from; and screenshots of the print page in both a screen and a print
rendering.
