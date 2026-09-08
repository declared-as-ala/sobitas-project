# Phase 14 — the flash header: it is left-aligned, not laid out

## What the owner said, seeing Phase 12 on production

> *"in the vente flash you didn't do nothing, you just put all of them to the left!!! but omg we
> still have all of that white space in the right. find a better layout for the header of the ventes
> flash section"*

They are right, and Phase 12's own metric hid it. The measurement was "widest gap between adjacent
groups: 917px → 32px", and that number improved by moving every group to the left, which converts
one gap in the middle into one gap on the right. The void did not go away; it changed address.

## What the screenshot actually shows, at ~1900px

- `VENTES FLASH` then `VOIR TOUTES LES OFFRES` on one line, both hard left.
- Below: `JUSQU'À −24%`, then `Jusqu'à 31 DT d'économie / Sur 4 produits sélectionnés`, then
  `Prochaine échéance / 3 octobre 2026 à 19:50`, then the dark countdown tile — all four hard left,
  ending around x≈940.
- **Everything right of ~940px is empty.**
- Directly beneath, the four product cards span the FULL width, edge to edge.

So the header occupies roughly the left half of a container whose own grid uses all of it. The
header and the cards do not agree about how wide the section is, and that mismatch is what reads as
broken — more than the whitespace itself does.

## The actual requirement

**The header must occupy the same measure as the product grid below it, with its content
distributed across that measure — not clustered at one end.**

Both ends need real content, or the eye reads the empty end as a mistake. There is enough material
for that: an identity, a discount, a deadline and a link. A workable split, which you may improve on
but must beat rather than ignore:

- **left**: `VENTES FLASH` and the `−24% / 31 DT / 4 produits` offer cluster — the "what"
- **right**: the deadline line, the countdown tile, and `VOIR TOUTES LES OFFRES` — the "when" and
  the "where next"

That fills both ends, keeps related things together, and means the countdown sits above the right
edge of the card grid rather than in the middle of nowhere.

**Verify by alignment, not by gap size.** The measurement that matters now:

- the left edge of `VENTES FLASH` must align with the left edge of the first product card
- the right edge of the rightmost header element must align with the right edge of the last card
- report both as pixel offsets at 1440 and 1920. Offsets should be 0, or explained.

Do **not** report "widest gap" as the success metric again — it is what produced this outcome.

## Constraints that still hold

- Mobile is a different problem and it is currently fine: 217px at 390 after Phase 12, down from
  371px. **Do not regress it.** At narrow widths the two clusters stack; that is correct. Report the
  390 height and keep it ≤ 221px.
- 768 was 219px after Phase 12. Keep it at or below that.
- **Every number stays real**: −24% is the deepest actual discount, 31 DT the largest actual saving,
  4 is `offers.length`, and the countdown is the earliest real `promo_expiration_date`, read through
  `getPriceDisplay` from `prix`/`promo`. Do not hardcode or round.
- The countdown keeps rendering `--` server-side and hydrating; the absolute date stays crawlable.
- The dark scope is allowed on the countdown tile only. The band itself is not dark.
- ≥44px targets, French copy, tokens only, `Section` spacing (DS008).

## Do

1. Read `.claude/skills/protein-ui/SKILL.md`, then your Phase 10 and Phase 12 comments in
   `VentesFlashSection.tsx`.
2. `VentesFlashSection.tsx` is the file. Touch `FlashDealCard.tsx` only if the grid's own measure
   has to change to make the alignment true — and if it does, say so explicitly, because that means
   the header was not the only thing misaligned.
3. Find what actually constrains the card grid's width (a `Container`, a `Section width=` prop, a
   max-width) and make the header obey the same constraint. If the header is currently outside that
   container, that is the bug — name it in your report.
4. Measure at **390, 768, 1024, 1440 and 1920**, both themes.

## Don't

- Do not touch `GoogleReviewsSection.tsx`, `ReviewMarquee.*`, `BrandsSection.tsx`, `loyalty/*`,
  `reviews/*`, the quick-order sheet, the blog route, `layout.tsx`, `globals.css`, or
  `content/categories/*.json` — all carry concurrent work.
- No new dependencies, no `backdrop-blur` (DS009). Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p14 npm run build   # a dist dir that does not exist yet
```

Report: the left-edge and right-edge offsets between the header and the card grid at 1440 and 1920
(before and after), the header height at 390 / 768 / 1024 / 1440 / 1920, and every number still
displayed with where it is read from.
