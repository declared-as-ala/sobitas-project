# Phase 4 — Google review stars, and the partners band

Two small, independent pieces on the landing page.

## A. The star colour in the Google review cards

Owner: *"the google reviews make the stars in the cards in green maybe better"* — note the "maybe".
They are asking for a judgement, not just an edit.

Currently `GoogleReviewsSection.tsx` uses `text-rating` (the amber/gold ramp) for both the big
header rating and the per-card stars.

**Do this:** make the **card** stars green (`text-ok`), keep the **header** rating stars amber.

**And say what you think in your report.** My own view, which you should challenge if you disagree:
gold is the universal rating convention and it is specifically what Google itself renders, so on a
section whose entire purpose is *borrowed authority from Google* — it carries Google's four-colour
logo three lines above — green stars may read as "not actually Google". The counter-argument is that
green is this site's trust colour (`--c-ok`, the "Achat vérifié" green) and the cards already carry
a Google mark for provenance, so the stars do not have to do that job twice.

Implement it so reverting is one token change, and give me your recommendation. I will decide.

Check contrast: `--c-ok` is 5.02:1 on an untinted surface but the design system warns a status
colour must not tint its own background. These stars sit on `bg-elevated` inside a bordered card, so
verify rather than assume — and remember `fill-current` means the fill takes the text colour.

## B. Nos marques partenaires

I rebuilt this on 08/09 — 24 logos in a native scroll rail, replacing a marquee that duplicated them
into 48 tiles, plus a real `contain-intrinsic-size` (156px) instead of the inherited 600px. Measured
after that change: **186px at 320 and 390, 185px at 1440.**

The owner still wants it *"more beautiful and more pro"*. It is currently a functional rail and
nothing more. Make it feel like a credential rather than a logo dump:

- brand logos are real assets — do not generate, replace or restyle them into something they are not
- if a logo is missing or renders badly, report it, do not paper over it
- the band is `defer`red; if you change its height materially, update `contain-intrinsic-size` to
  match or you reintroduce the phantom-height bug I just fixed
- it links to brand pages — those links are internal-linking value, keep every one

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first.
2. Both files are **absent from `design-baseline.json`** — they must finish at **zero** violations.
3. Report the measured-or-expected height of the brands band at 320/390/1440 so I can compare
   against 186/186/185.

## Don't

- No new dependencies, no carousel library, no `backdrop-blur` (DS009).
- Do not touch the flash-sale or blog sections, the PDP, checkout, account, reviews, or any SEO file.
- Do not commit, stage or push. **No network** — no dev server, no puppeteer, no fetching.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
```

I run the build and measure both bands at 320/390/1440 in both themes, and I check the star contrast
against the real rendered background.
