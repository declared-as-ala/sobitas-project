# Phase 12 — the Ventes flash HEADER only. Stretched and cramped at the same time.

## What the owner sent, and what it shows

A full-width desktop screenshot of the Ventes flash header, with:

> *"this is the header for the ventes flash, let's try to fix it… as you can see it's squeezed, not
> organised, and a lot of whitespace. let's fix this for desktop and for mobile, for the last time,
> so focus on it."*

Read the screenshot carefully — this is a **layout** problem, not a styling one. What it shows at
roughly 1900px wide:

**Row 1** — `VENTES FLASH` set very large, hard against the left edge. `VOIR TOUTES LES OFFRES` as a
pill, hard against the right edge. Between them, a completely empty band the width of half the page.

**Row 2** — a left cluster (`JUSQU'À` kicker, then a large `−24%`, then two small stacked lines
`Jusqu'à 31 DT d'économie` / `Sur 4 produits sélectionnés`) that reads *cramped* — the −24% and the
two text lines are jammed together with almost no breathing room and no clear relationship. Then
another wide dead zone. Then, hard right, `Prochaine échéance / 3 octobre 2026 à 19:50` beside the
dark countdown tile.

So the header is **stretched to both edges with a void in the middle, while its own contents are
squeezed**. That is the contradiction the owner is describing, and it is what
`justify-between` across a very wide container does: it solves alignment by pushing everything
apart, and never decides what belongs next to what.

## The job

**Group by meaning, then place the groups.** The header carries four things:

1. the section identity — `VENTES FLASH`
2. the offer — `−24%`, `31 DT d'économie`, `4 produits`
3. the deadline — `Prochaine échéance`, the date, the countdown
4. the way out — `VOIR TOUTES LES OFFRES`

Right now those four are scattered across two rows by edge-alignment. Decide the grouping and
commit to it. Options worth weighing, but **you choose and defend it**: the offer and the deadline
are the two halves of the same sentence ("this much off, until this moment") and probably belong
adjacent rather than at opposite ends; the identity and the CTA are chrome and can share a line.

Constraints on the fix:

- **Stop the middle void.** Cap the header's measure or let the groups sit next to each other
  rather than at the extremes. A heading does not have to touch the left edge and a pill does not
  have to touch the right edge just because the container is 1900px wide.
- **Give the −24% cluster room.** It is the single most important number in the section and it is
  currently the most cramped thing on the page. The kicker, the number and the two supporting lines
  need a deliberate relationship — the number leads, the rest supports it.
- **Mobile.** Phase 10 already cut the mobile header block 371px → 221px, which was a real win.
  Do not undo it. But check the same grouping question at 390: are those four things still legible
  as four things, or has compression turned them into a list? Report the height and keep it at or
  below 221px.
- The countdown tile is allowed to be a dark scope — the skill's table permits it on flash countdown
  tiles specifically. The band itself must not be dark.

## Hard constraints — unchanged

- **Every number stays real and stays present**: −24% is the deepest actual discount, 31 DT the
  largest actual saving, 4 the real count, and the countdown is the earliest real expiry. Read from
  `prix`/`promo`/`promo_expiration_date` via `getPriceDisplay`. Do not hardcode or round for looks.
- The countdown must keep rendering `--` server-side and hydrate on the client. The absolute date
  stays visible and crawlable. Do not "fix" that.
- The honest empty/expired state survives.
- ≥44px hit targets, French copy, tokens only, `Section` spacing scale (DS008).

## Do

1. Read `.claude/skills/protein-ui/SKILL.md`, then your own Phase 10 comments in
   `VentesFlashSection.tsx` — they record what each element is for.
2. **`VentesFlashSection.tsx` is the file.** Touch `FlashDealCard.tsx` only if the card grid must
   change to match, and say why. Both finish at **zero** design-lint violations.
3. Measure at **390, 768, 1440 and 1920** — the screenshot is ~1900px and the void is worst at the
   widest widths, so 1440 alone will not show you the bug. Both themes.

## Don't

- Do not touch `GoogleReviewsSection.tsx`, `ReviewMarquee.*`, `BrandsSection.tsx`,
  `loyalty/Protina.tsx` or `LoyaltyEarnLine.tsx` — those carry uncommitted Phase 11 work.
- Do not touch the blog route, `layout.tsx`, `globals.css`, or `content/categories/*.json`.
- No new dependencies, no `backdrop-blur` (DS009).
- Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p12 npm run build   # a dist dir that does not exist yet
```

**Build into a directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled output
earlier today and made a correct fix look broken for half an hour.

Report: the header block height at 390 / 768 / 1440 / 1920 before and after, the widest horizontal
gap between two adjacent groups at 1920 before and after (that is the void, measure it), and every
number still displayed with where it is read from.
