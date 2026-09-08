# Phase 3 — Make the sur-commande sheet convert, honestly

## Where this stands

`frontend/src/app/components/ProductRequestDialog.tsx` opens when a shopper taps a product that is
**sur commande** (back-order). It has three steps: `alternatives` → `form` → `sent`.

I already inverted its CTA hierarchy on 07/09/2026 — read that file's comments before changing
anything, they explain what was tried and why:

- every alternative card ends in a full-width primary **"Choisir celui-ci"**
- the request path is a plain underlined link in the footer, not a bordered button
- the first card is marked "Le plus proche de votre choix"
- the requested item shows "Sur commande · délai non garanti" in `warn`, next to a clock

The owner's target: **90% of people who tap a sur-commande product should leave with something we
actually have.** The hierarchy is now right. What is missing is a reason to believe.

## The job: give the shopper enough to decide

Right now a card shows: image, name, category · format, "En stock", protein (when known), "Livré en
24-72 h", price, CTA. That tells them *what it is*. It does not tell them **why this one is a fair
swap for the thing they wanted**.

Design the "deep reveal": when a shopper opens a card (or by default on the first one), show a real
comparison against the product they asked for. You have `ComparisonRow` — `brand`, `category`,
`format`, `price`, `oldPrice`, `inStock`, and `facts` (protein, carbs, sugars, fat, energy, gluten,
lactose, plus `basis`). `buildComparison` already ranks by similarity.

Use `visibleNutrients` from `frontend/src/util/productComparisonFacts.ts` — it returns only the
nutrients at least one compared product declares, so a creatine swap does not print "Protéines —".
That helper exists precisely for this; do not hardcode the five macros.

## Persuasion: honest only

The owner said "social engineering". Build **honest persuasion** and nothing else:

**Allowed, because it is true and checkable**
- the real difference in protein/price/format against what they asked for
- genuine stock state, genuine delivery window
- that the requested item has no confirmed date — it does not
- a real saving when `oldPrice` exists

**Forbidden, and do not add it even if asked again**
- countdown timers on a request sheet, "3 people are viewing", invented stock counts
- fake "only 2 left" where the number is not the real `qte`
- pre-ticked anything, or making the request link harder to find/reach

A shopper who is tricked into a swap returns it and does not come back. The 90% has to come from
the alternative genuinely being a better outcome — available now, comparable, priced — not from
the request path being hidden. It must stay one tap away and clearly labelled.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first, then the existing comments in
   `ProductRequestDialog.tsx` and `productComparison.ts`.
2. Build the comparison reveal. Decide the interaction yourself — expanded first card, a toggle per
   card, or always-on — and defend it in your report. On a 390px phone it must not push the CTA
   below the fold; that would undo Phase 1 of this work.
3. Keep all three steps working, the honeypot intact, and the API calls unchanged.
4. Sizes: ≥44px targets, French copy, tokens only. `ProductRequestDialog.tsx` is **not** in
   `design-baseline.json` — it must finish at **zero** design-lint violations.

## Don't

- No new dependencies. No `backdrop-blur` (DS009).
- Do not touch the PDP, checkout, account, reviews, landing, or any SEO file — Phases 1 and 2 are in
  flight there.
- Do not commit, stage or push. You have **no network**: no dev server, no puppeteer, no fetching.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
```

I run the build and measure the sheet at 320/390/1440 in both themes. In your report give me the
expected height of one alternative card at 390 before and after, and state plainly which persuasion
signals you used and where each number comes from. Any figure that is not read from real product
data is a defect, not a feature.
