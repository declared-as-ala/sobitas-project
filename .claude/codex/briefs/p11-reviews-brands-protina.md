# Phase 11 — Two moving rows of Google proof, logos without names, a bigger Protina mark

Three independent pieces. Owner, 08/09/2026:

> *"the google reviews shown in the landing page should be shown as a small 2 rows animated moving
> and beautiful and simple, and for the marques we have take off the names since we have the logos,
> for the protinas logo in the products details make it bigger the icon"*

---

## A. Google reviews — 2 rows, moving, smaller

**Read this before you change anything, because it reverses a decision this file documents.**

`GoogleReviewsSection.tsx`'s header records that a marquee was REMOVED on 07/09/2026: *"The single
scrolling row showed two cards at a time and moved on its own, so a reader who wanted to finish a
sentence had to chase it."* It became a static 3-row grid, and Phase 7 then added `ReviewReveal`, a
one-shot settle animation.

The owner has now seen that and asked for two moving rows. **That is the decision — implement it.**
Do not re-argue it in code or comments. What you must do is make motion that does not punish a
reader:

- **Pause on hover and on keyboard focus within the row.** This is the thing that makes a marquee
  readable — a reader who wants to finish a sentence stops it by pointing at it.
- **`prefers-reduced-motion: reduce` must stop the movement entirely** and leave a readable,
  fully-visible static layout. Not paused-but-clipped: readable.
- The cards are links. Every card must stay reachable and activatable by keyboard, and focus must
  not be lost or scrolled out from under the user by the animation.
- Under 768px `globals.css` clamps every transition/animation to 0.2s on `*:not([data-motion])`. A
  marquee needs far longer, so it must carry `data-motion` — that attribute exists for exactly this.
  Do not widen the selector.
- Two rows, and the owner asked for **small and simple**: the cards should be more compact than
  today's. Rows moving in opposite directions is the usual way two rows avoid looking like one
  block; decide and say why.

Keep, because they are the section's whole purpose: the four-colour Google mark, the
`writeReviewUrl` CTA that opens Google's compose box directly, the rating and the provenance
`<dl>` (`Avis publics` / `Source` / `Vérifié le`).

`ReviewReveal.tsx` exists for the one-shot reveal. If the marquee replaces it, delete it and say so
— do not leave both running on the same cards.

**The data changed today.** `content/googleBusinessReviews.ts` now holds **20 real reviews in three
languages** (`fr`, `en`, `ar-Latn-TN`), multilingual ones first. Each card sets `lang`. These are
real quotes from a real profile: **never add, edit, translate or invent one.** If the marquee needs
more cards to loop smoothly, repeat the existing ones — do not fabricate.

## B. Nos marques partenaires — drop the names

`BrandsSection.tsx`. The logo is the recognisable thing; the name under it is redundant.

- Remove the visible text label, but **the accessible name must survive** — the link still needs to
  say which brand it goes to, via `alt` on the logo or an `aria-label`. A logo tile with no
  accessible name is a link that reads as "link" to a screen reader.
- The band was rebuilt in Phase 7 and measures **496px at 1536 / 373px at 390**. Removing a line of
  text per tile changes that; if the height moves materially, update `contain-intrinsic-size` to
  match or you reintroduce the phantom-height bug this page has had twice.
- Every brand link is internal-linking value. Keep all 24.
- If a logo is unreadable without its name (a wordless mark, or one that renders too small), say so
  in your report rather than quietly leaving that one labelled.

## C. The Protina mark on the product page — bigger

`app/components/loyalty/Protina.tsx` and its use on the PDP. The owner wants the icon larger.

Find where it renders in the product detail view, increase the mark, and keep it aligned with the
number beside it — a larger icon that no longer sits on the text baseline looks broken, not bigger.
Report the before/after pixel size and where you changed it.

---

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first.
2. Files: `GoogleReviewsSection.tsx`, `ReviewReveal.tsx`, `BrandsSection.tsx`,
   `loyalty/Protina.tsx` and whichever PDP file sizes it. All must finish at **zero** design-lint
   violations unless already in `design-baseline.json` — check with
   `npm run lint:design -- --report <file>`.
3. Measure at 320 / 390 / 768 / 1440 in **both themes**.

## Don't

- Do not touch `VentesFlashSection.tsx` or `FlashDealCard.tsx` — another task is editing them right
  now. Do not touch the blog route, `layout.tsx`, `globals.css` RTL rules, `I18nProvider.tsx`,
  `util/internalLinks.ts`, `util/articleLanguage.ts`, `util/structuredData.ts` or
  `content/categories/*.json` — those carry uncommitted work.
- No new dependencies, no animation library, no `backdrop-blur` (DS009).
- Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p11 npm run build   # a dist dir that does not exist yet
```

**Build into a directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled output
earlier today and made a correct fix look broken for half an hour.

Report: the Google section height at 390 and 1440 before and after, how pause-on-hover and
reduced-motion behave, the brands band height and its `contain-intrinsic-size`, and the Protina
mark's before/after size.
