# Phase 10 — Ventes flash: same information, less height

## Where it stands

You rebuilt this in Phase 7. It worked: the band went from **303px to 774px at 1536** and stopped
reading as the least important thing on a page where "nouveaux produits" got 1135px. Measured after
that change: **715px at 390, 694–774px at desktop.**

Owner, now, having seen it:

> *"revise the section, polish the design, better usage of whitespace i want, smaller on the
> desktop, and on the mobile smaller header"*

So the hierarchy fix landed and the execution is loose. This is **not** a request to undo Phase 7 —
the section must still read as the commercial peak of the page. It is a request to buy that
prominence with less vertical space.

## The job

**Desktop: make it materially shorter without dropping information.** Not by shrinking type until
it is weak — by tightening the space between things, using horizontal room the layout is currently
wasting, and removing any element that repeats what a neighbour already says. Target roughly
**550–620px at 1440**, and say what you actually achieved. If you believe a smaller number is
right, argue it with the measurement.

**Mobile: the header block is too tall.** At 390 the section leads with a kicker, a title, a
"VOIR TOUTES LES OFFRES" link, a big −24% tile, a savings line, a "sur une sélection de N produits"
line, a countdown label, the countdown itself, and an absolute end date — before a single product.
That is a lot of chrome above the first card on a 390px-wide screen. Compress it: the discount, the
deadline and the CTA are the three things that matter; the rest can combine, shrink, or go.

**Whitespace is the actual brief.** Uneven gaps read as unfinished — that is usually what "polish"
means here. Go through the section's vertical rhythm and make the spacing deliberate: equal gaps
between equal things, a clear step between the header block, the cards and the footer. Use the
`Section` spacing scale rather than ad-hoc `py-*` (DS008).

## Hard constraints — these do not move

- **Every number stays real and stays present.** −24% is the deepest actual discount, 31 DT the
  largest actual saving, and "prochaine échéance" is the earliest real per-card expiry. Do not
  hardcode, round for looks, or drop a number to save space. If a number goes, it is because it was
  duplicated elsewhere on screen, and you say so.
- **The countdown must keep rendering `--` server-side and hydrate on the client.** That is
  deliberate: it means no fabricated time is ever in the HTML, while the absolute date stays
  crawlable. Do not "fix" it.
- The honest empty/expired state must survive.
- ≥44px hit targets, French copy, tokens only.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first, then your own Phase 7 comments in
   `VentesFlashSection.tsx` and `FlashDealCard.tsx` — they record why each element exists, and the
   ones that record a real reason should survive this pass.
2. `VentesFlashSection.tsx` and `FlashDealCard.tsx` are yours. Both must finish at **zero**
   design-lint violations — check with `npm run lint:design -- --report <file>`.
3. If you change the band's height materially and it is `defer`red, update `contain-intrinsic-size`
   to match, or you reintroduce the phantom-height bug that was fixed on this page twice.

## Don't

- Do not touch the Google reviews section, the brands band, the blog band, the promo banner, or any
  file outside those two components — **five other changes are uncommitted in this working tree
  right now**, including `layout.tsx`, `globals.css`, `blog/[slug]/**`, `I18nProvider.tsx`,
  `util/internalLinks.ts`, `util/articleLanguage.ts` and `content/categories/*.json`. Touching any
  of those will collide.
- No new dependencies, no `backdrop-blur` (DS009), no carousel library.
- Do not commit, stage or push. **No network.**

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-p10 npm run build    # a dist dir that does not exist yet
```

**Build into a directory you just created.** A reused `NEXT_DIST_DIR` served stale compiled output
earlier today and made a correct fix look broken for half an hour.

Report the measured section height at **390 and 1440 in both themes**, before and after, the height
of the mobile header block specifically (top of the band to the top of the first product card), and
every number still displayed with where it is read from.
