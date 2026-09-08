# Redesign three landing-page sections: Ventes flash, Nos marques partenaires, Le blog

## Context

The owner's words: *"make it more useful and more beautiful, more pro."* All three sit below the
fold on `/` and are the last thing a visitor sees before the footer.

I measured them live on 07/09/2026 with a real browser. Beat these numbers, and tell me the new
ones:

| Section | 390px | 1440px | items |
|---|---|---|---|
| Ventes flash | 388px | 319px | 8 |
| Nos marques partenaires | **629px** | **193px** | 48 logos |
| Le blog | 629px | 537px | 6 articles |

**Brands is the clearest defect: the same 48 logos cost 3.3x more height on a phone than on a
desktop.** Diagnose that before restyling anything — measure the grid, do not guess.

## Files

- `frontend/src/app/components/VentesFlashSection.tsx` (185 lines) and `FlashDealCard.tsx` (114)
- `frontend/src/app/components/BrandsSection.tsx` (227)
- `frontend/src/app/components/BlogSection.tsx` (224)
- They are composed in `HomeDeferredSections.tsx` / `HomePageClient.tsx` — read, do not restructure.

## Do

1. **Read `.claude/skills/protein-ui/SKILL.md` first**, then `DESIGN_SYSTEM.md` (root) and
   `frontend/DESIGN_SYSTEM.md`. This is a design-system-enforced codebase; inventing a value that
   already exists is the fastest way to fail the build.
2. **Measure before you change anything.** Run the dev server and measure each section at 320, 390
   and 1440 in both themes. Write the numbers down; they go in your report.
3. Redesign each section. Direction, not prescription — you decide the shape, but:
   - **Ventes flash** is the commercial moment on this page. The discount, the countdown and *which
     products* are the hierarchy. It must answer "how much off, on what, for how long" without a
     reader working for it.
   - **Nos marques partenaires** must stop costing 629px on a phone for a logo wall. Find the
     actual cause first.
   - **Le blog** is editorial credibility. Check whether articles carry cover images; if a card
     looks empty because the data is missing, say so in RISKS rather than inventing artwork.
4. Keep every section server-rendered where it already is. `PromoBanner`, `BlogSection` and
   `BrandsSection` were deliberately moved off `dynamic(ssr:false)` for LCP/SEO/CLS — see the
   comment in `HomeDeferredSections.tsx`. Do not undo that.
5. Do not change data fetching, props, `generateMetadata`, JSON-LD, or any `href`.

## Don't

- Do not touch the PDP, checkout, account, or the reviews system. Other work is in flight there.
- Do not commit, stage or push. Leave everything in the working tree.
- Do not add a carousel library, an animation package, or `backdrop-blur` (DS009 bans it outright).
- Do not generate images or video for this task. You can, and it is not the right tool here: the
  brand logos and article covers are real assets and fabricating replacements would misrepresent
  partners and editorial content. If a real asset is *missing*, report it — do not fill the hole.

## Acceptance

All four files are **absent from `design-baseline.json`**, so they must finish at **zero** design
lint violations — not "fewer", zero. I will re-run all of this myself:

```
cd frontend
npx tsc --noEmit
npm run lint:design          # must print "baseline holding"
npm run lint
NEXT_DIST_DIR=.next-verify npm run build && git checkout tsconfig.json
node scripts/check-seams.mjs http://localhost:3000
node scripts/check-console.mjs http://localhost:3000     # zero errors
```

Plus, from me: no horizontal overflow at 320/390/1440, both themes, and a measured height for each
section before and after. A redesign that cannot state what it improved will be sent back.
