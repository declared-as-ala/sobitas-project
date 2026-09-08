# Phase 5 — /login and /register: modern, and actually fitting on a phone

## The measurement

`npm run measure-auth` against the current build reports **22 failures**. The ones that matter:

```
fit  Android 360x740  /register   65px TALLER than the viewport (content 709 + 96 reserved for the Google block vs 740)
fit  iPhone SE 375x667 /register  138px TALLER than the viewport
     /register  submit button "Créer mon compte" not found        × 10 (every width, both themes)
     /register  under 44px: input:(1px)                            × 10
```

`/login` passes the fit checks. `/register` does not fit on either phone the guard tests.

Two of these need judgement rather than a fix:

- **"submit button not found"** — the guard looks for a button whose text is "Créer mon compte".
  Either the label changed or the guard is stale. Find out which. If the guard is wrong, fix the
  guard and say so; do not rename a real button to satisfy a stale assertion.
- **`input:(1px)`** is almost certainly the anti-bot honeypot, which is *supposed* to be 1px and
  unreachable. If so, the guard should exempt a field it can prove is a honeypot
  (`name="hp_field"`, `tabindex="-1"`, `aria-hidden`), not have the form grow it to 44px. Check
  `ReviewThread.tsx` / `ReviewComposer.tsx` for the established honeypot shape.

Read `scripts/measure-auth.mjs`'s own header first — it documents three ways a guard here has lied
before, including the `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env flag that hides the Google block locally
and made the fit check pass a page ~96px shorter than production. That is why the numbers above say
"+96 reserved".

## The design ask

Owner: make these *modern, matching the site's design system and the Google-review section I just
built*. That section is the reference for current quality — `GoogleReviewsSection.tsx`: a real
Google mark drawn as inline SVG, a definition list of provenance data, cards on `bg-elevated` with
`border-hairline`, one primary CTA in `bg-brand`.

`AuthShell.tsx` (262 lines) is shared by all four auth screens — login, register, forgot-password,
reset-password. Changing it changes all four, so measure all four.

Note from the file's own history: a previous pass found "~1,100px of panel, none of it about having
an account". Whatever you build, the panel should argue for *this* account — and the one honest
argument this shop has is the loyalty programme, since delivery, authenticity and
cash-on-delivery are identical for a guest. See `LoyaltyEarnLine.tsx`'s header for that reasoning.

## Do

1. Read `.claude/skills/protein-ui/SKILL.md` first, then `AuthShell.tsx` and `measure-auth.mjs`.
2. Make `/register` fit a 375x667 viewport with the Google block's 96px reserved. That is the
   headline number: **138px must come out**, and it must come out of chrome, not of the form.
3. All three files are **absent from `design-baseline.json`** — finish at **zero** violations.
4. Do not remove the honeypot, change any form field name, or touch auth logic, validation rules or
   API calls. Password rules in particular: the file's history records "minimum 6 caractères" on a
   form whose backend wanted 8. Do not re-introduce a client rule that disagrees with the server.

## Don't

- No new dependencies, no `backdrop-blur` (DS009).
- Do not touch the PDP, checkout, account, reviews, landing, or any SEO file.
- Do not commit, stage or push. **No network** — no dev server, no puppeteer, no fetching.

## Acceptance

```
cd frontend
npx tsc --noEmit
npm run lint:design      # must print "baseline holding"
npm run lint
```

I run `npm run measure-auth` against a real build — it tests 5 widths x 2 themes x 4 routes plus two
device fit checks. **22 failures today; I expect zero, or a written argument for each one left.**
Report the expected content height of /register at 375x667.
