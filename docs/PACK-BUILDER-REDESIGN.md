# /pack-builder — the study, the decisions, and what shipped

> **2026-08-04, second pass.** The shelf layout below was superseded before it reached production by
> a **guided wizard** — welcome → goal → one step per category → recap. Owner: *"there is a lot of
> text and a lot of numbers and a lot of icons, and that's bad for the user. I want the whole
> experience to be steps."* §1–§2 (the measurements and the research) still stand and still explain
> why the page needed changing at all; §3.2's shelf is replaced by §7. Read §7 for what actually
> shipped.

*Written 2026-08-04. Owner brief: "the design looks so bad… the user experience itself and the flow
of making the pack is so bad… why should I see all those intros from the up, I want to directly
start making my pack… I keep scrolling, scrolling, scrolling to see just créatine… the screen on
mobile looks so filled."*

---

## 1. The measurement — every complaint, as a number

`node frontend/scripts/measure-packbuilder.mjs` against the live page, before any change.
Measured at the **real small viewport** (390×746 for an iPhone 13, not the 844 screen height) —
headless Chrome has no retractable toolbars, so measuring at screen height measures a phone that
does not exist. Same trap that made `measure-hero.mjs` report "0px cropped" on a visibly cropped hero.

| | iPhone 13 390×746 | Android 360×566 | Desktop 1440×820 |
|---|---|---|---|
| document | 13,035 px · **17.5 screens** | 12,616 px · **22.3 screens** | 11,460 px · 14.0 screens |
| scroll before the first product "Ajouter" | 1,117 px · **1.50 screens** | 1,118 px · **1.98 screens** | 1,188 px · 1.45 screens |
| whey → pre-workout ("category reach") | 8,104 px · **10.9 screens** | 7,744 px · **13.7 screens** | 8,016 px · 9.8 screens |
| screen area under fixed chrome | **30.2%** | **39.9%** | 0.2% |

The five fixed elements stacked on a phone: install banner (390×81), pack bar (390×74), tab bar
(390×57), WhatsApp FAB (56×56), back-to-top (44×44).

**Read the third row again.** Each of the five categories occupies ~2,026 px because twelve products
are laid out as a 2-column grid — six rows deep. To compare a créatine with a whey you scroll two
full screens up and two back down. That is not a browsing experience; it is a filing cabinet.

## 2. What the world does (and what to take from it)

- **Progress beats a price list.** Every current bundle builder — Rebuy, Biscuits, BOGOS — replaced
  the static "spend 200 → save 5%" table with a live bar, because *"add 52 DT for −12%"* is a prompt
  and a table is furniture. **We already ship this** (`TierProgress`). Keep it, make it persistent.
- **A persistent panel that lists what is in the box.** Universal in the category, and the one thing
  we do worst: today the phone shows only a count and a total until you tap to expand.
- **Step-by-step over a wall.** Breaking the decision into "goal → shelf → done" is what stops
  choice paralysis on a 56-product page.
- **Horizontal shelves are the standard for browsing within a category** — Amazon, ASOS, Netflix.
- **Baymard's carousel warning is real but is about a different thing.** Their finding (46% of
  carousel implementations have usability issues; users scroll straight past them) is about
  *auto-rotating homepage hero banners* competing with the page's purpose. A manual, snap-scrolling
  product shelf inside a category the user has already chosen is the opposite situation. The part of
  their finding that **does** transfer is discoverability: horizontal content people do not know is
  there gets missed. Hence the three non-negotiables below.

**Shelf requirements, adopted from that risk:**

1. **A visible peek.** A partially-cut card at the right edge is the only reliable "this scrolls"
   signal — arrows are ignored, scrollbars are hidden on touch. Card widths below are chosen so the
   peek is 28–98 px at every phone width in the matrix.
2. **State the shelf's size.** "12 produits" in the rail header, so nobody assumes three is all of it.
3. **Snap + a real "Voir tout" escape hatch** to the full category page for anyone who wants the grid.

## 3. Decisions

### 3.1 No animation library — CSS + the Web Animations API

The brief asked for "some things with framer motion". `motion` is **not installed**: it was removed
as dead weight (0 imports) once `ScrollToTop` stopped using it, and re-adding it costs ~34 kB gzip on
a route whose entire job is to be fast and convert.

Everything asked for is reachable without it:

| effect | mechanism | cost |
|---|---|---|
| product flies into the pack | `Element.animate()` (WAAPI), transform + opacity only | 0 kB, compositor-only |
| count badge pops | `@keyframes pt-pop`, replayed via a React `key` | 0 kB |
| tier unlocked | `@keyframes pt-tier-ring` one-shot | 0 kB |
| card select, stepper press | `transition-[…]`, `active:scale-95` | 0 kB |
| shelf scrolling | native `scroll-snap` | 0 kB |

WAAPI is not a downgrade here. `element.animate()` runs on the compositor exactly like a library's
transform track, and animating **only transform and opacity** is what keeps it off the main thread —
which matters more on this page than anywhere, because it is the page with 56 images and a debounced
network quote already competing for the phone's CPU.

**This is interaction feedback, not entrance animation.** DESIGN_SYSTEM §9 says "motion is calm.
Prefer no entrance animation" — nothing here animates on load. Every animation below is the answer
to a tap the visitor just made, which is the one case where motion earns its cost: it tells you the
thing you did worked, and where the result went.

Reduced motion is honoured at the source (`packMotion.ts` returns early on
`prefers-reduced-motion: reduce`), not merely at the CSS layer.

### 3.2 The vertical grid becomes a horizontal shelf

| | before | after |
|---|---|---|
| per category | ~2,026 px (12 products, 2-col, 6 rows) | ~330 px (one row, scrolls sideways) |
| 5 categories | ~10,100 px | **~1,650 px** |

Card widths, chosen so the peek is always visible:

| width | card | at 360 | at 390 | at 430 |
|---|---|---|---|---|
| base | `9rem` = 144 px | 2 cards + **28 px peek** | 2 + **58 px** | 2 + **98 px** |
| `sm` | `10.5rem` = 168 px | — | — | — |
| `lg` | `11.5rem` = 184 px | 5 cards + peek in the 1,004 px content column | | |

`sizes="(min-width: 1024px) 184px, (min-width: 640px) 168px, 144px"` follows §7 — the frame is
square and the image is `object-contain`, so the required width *is* the card width.

### 3.3 Get to the products in one screen

1,117 px of preamble, itemised: page header 250 px + tier card 210 px + advisor 470 px + jump nav +
gaps. Each earns its place individually and the sum does not.

- The **H1 block stays** — it is the page's only H1 and the canonical/OG title depends on the page
  reading as a page. It gets tighter, and `Accès Pro` stops being a top-right sibling of the H1 on
  mobile (it was pushing the subtitle to three lines).
- The **advisor collapses to one row of four chips.** The four cards with hints were 470 px to ask a
  one-tap question. The calculator is not deleted — it moves behind *"Calculer mes besoins"*, which
  is where it belongs: optional, and only interesting to someone who already answered the first
  question.
- The **tier strip loses the label row** and becomes a single line: bar, current %, next threshold.
- The **jump nav merges into the tier strip's row** rather than being a third band.

### 3.4 One piece of bottom chrome, not four

The phone loses 30–40% of its screen to floating furniture. On this page:

- **WhatsApp FAB → hidden** (`/pack-builder` joins `HIDDEN_ON`, next to `/checkout` and `/cart`,
  for the identical reason: a sticky purchase CTA already owns the bottom of the screen). WhatsApp
  gains a **row in the mobile menu**, which it never had — so the channel is *moved*, not removed.
  Owner's words: "put it maybe in the header or in the sidebar."
- **Back-to-top → removed from this page.** The category chips are a better and always-available
  version of the same affordance, and a 44×44 circle that overlaps product cards to offer a scroll
  the user can already do is a net loss.
- **The pack bar absorbs the progress bar** (a 3 px fill along its top edge) instead of a second
  sticky element competing for the same job.

Net: 5 fixed elements → 3 (install banner, pack bar, tab bar), and the two removed are the two that
sat *on top of* the product grid rather than beside it.

### 3.5 "What have I added" and "what completes it"

Two additions, both driven by the brief's *"easy KPIs for user to see what you've already added,
suggestions of what you can add, making a complete pack."*

- **The tray** — a horizontal strip of the selected products' thumbnails with a remove control,
  directly under the tier strip, visible without expanding anything. Present only when the pack is
  non-empty, so an empty page pays nothing for it.
- **The completion nudge** — the categories not yet represented, ordered by the applied goal, as
  tappable chips that scroll to that shelf.

**What this deliberately is not.** It suggests *categories*, never quantities and never doses.
Turning a protein target into "buy N pots" needs per-product protein-per-serving, which this project
does not synthesise — the same constraint that governs `nutritionTargets.ts`. The nudge is
merchandising ("your pack has no créatine"), not advice.

## 4. Verification

`node frontend/scripts/measure-packbuilder.mjs --base <url>` is the regression gate. It asserts the
four numbers in §1, and fails on any horizontal body overflow.

Results after the redesign are recorded in §5.

## 5. Results

`node frontend/scripts/measure-packbuilder.mjs --base <url>`, same devices, same method:

| iPhone 13 390×746 | before | after | |
|---|---|---|---|
| document | 13,035 px · 17.5 screens | **4,560 px · 6.1 screens** | −65% |
| scroll before the first product "Ajouter" | 1,117 px · 1.50 screens | **639 px · 0.86 screens** | inside one screen |
| whey → pre-workout | 8,104 px · 10.9 screens | **1,391 px · 1.86 screens** | −83% |
| fixed elements on screen | 5 | **3** | the two removed are the two that floated *over* products |
| horizontal body overflow | none | none | |

| Android 360×566 | before | after |
|---|---|---|
| document | 12,616 px · 22.3 screens | **4,560 px · 8.1 screens** |
| first "Ajouter" | 1,118 px · 1.98 screens | **639 px · 1.13 screens** |
| whey → pre-workout | 7,744 px · 13.7 screens | **1,391 px · 2.46 screens** |

**Be honest about the occlusion number.** Fixed chrome went 30.2% → 28.0% of an iPhone screen, not
to zero. The remaining three are all edge-anchored full-width bars — the install banner (81 px), the
pack bar (71 px) and the tab bar (57 px) — and the percentage barely moves because those are wide
and short while the two things removed were small and square. The change that matters is *which*
chrome: the WhatsApp bubble and the back-to-top button were the only two sitting **on top of the
product grid**, and they are gone. The install banner is global, dismissible, and out of scope here.

**Gates.**

- `scripts/check-packbuilder.mjs` — 22 assertions, all passing: shelf geometry and peek at 360 px,
  the add→tray→total→tier flow driven as a customer does it, no orphaned flight clone, the FABs gone
  from this route *and still present on the homepage*, WhatsApp present in the mobile menu.
- `scripts/audit-contrast.mjs --routes /pack-builder --themes light dark` — **0 failures** at 1440
  and 390 in both themes.
- `lint:design` — PackBuilderClient went from **132 violations to 2** (the two are the
  `dark:text-emerald-*` pair on the savings figure, which has no token). Baseline lowered by 475.
- `tsc --noEmit` clean; production build clean; the route is still statically prerendered.

**Bundle.** 12.8 kB → 14.8 kB route JS (170 kB first load). That is the whole cost of the shelves,
the tray, the goal bar and the motion layer. Framer Motion alone would have been ~34 kB.

## 6. Two defects found while verifying

Both are recorded because each was a gate reporting green when it should not have.

**`lint:design` was writing the baseline before checking it.** The auto-lower step copied *every*
file's current counts into the baseline, including brand-new files — so a new file with violations
was reported as a failure and, in the same run, written into the baseline that made the next run
pass. Caught when `PartnersPageClient.tsx` was flagged "NEW FILES MUST BE CLEAN" and then silently
accepted on the re-run. Fixed: only files already in the baseline are rewritten. The violation it
had been hiding (`sm:p-7`, off the 8 px lattice) is fixed rather than baselined.

**`--routes /pack-builder` does not survive Git Bash.** MSYS path-converts a leading-slash argument
into a Windows path, so `audit-contrast.mjs` received `C:/Program Files/Git/pack-builder` and died
with "Cannot navigate to invalid URL". Prefix the command with `MSYS_NO_PATHCONV=1`. This affects
every documented invocation of that script on this machine, including the one in DESIGN_SYSTEM §0.6.

---

# 7. The wizard (what shipped)

## 7.1 Why steps replaced a page

The shelf layout fixed the scroll problem and left the real one untouched. A single screen was
showing, at once: a heading block, a goal question, a discount ladder with three thresholds, a
running total, a saving, a next-tier nudge, a selection tray, a completion prompt, and five
categories of twelve products. Every one of those earns its place individually. Together they
compete, and the visitor's first job becomes *deciding what to look at* rather than *choosing a
whey*.

```
welcome    what this is and what it earns you — three numbers, one button
goal       one question, four answers, no typing
category   one category per step, ordered by the goal
recap      what you built, whether it holds together, an optional needs check
```

Categories are steps rather than a scroll because it makes the ordering *experienced* rather than
read: the goal decides which category you are asked about **first**. Answering advances immediately —
the choice only reorders (never filters, never hides), so it is fully reversible, and a confirm
button on a reversible action is a step the visitor pays for and gets nothing back from.

Steps are **derived, never stored** (`wizard/steps.ts`). Storing a list would let the index and the
content drift apart the moment the goal reorders things — you would be on "step 4 of 7" showing a
category that had moved to position 2.

## 7.2 Framer Motion, and its real cost

The owner asked for it twice. It is now installed and used, and a wizard is the case that justifies
it: **a CSS transition cannot animate an element React has already removed from the DOM**, and the
thing that makes stepping feel like stepping is the outgoing step *leaving*. `AnimatePresence` exists
for exactly that.

It is loaded through `LazyMotion` + the `m` component with `strict`. One measured correction worth
recording: **`features={domAnimation}` is not lazy.** Passing the value is a static import; only the
FUNCTION form defers. That mistake cost **42 kB of route JS while the file still said "lazy"** —
14.8 kB → 56.6 kB. `wizard/motionFeatures.ts` exists solely to be the deferred chunk.

`layout` props were removed rather than fixed: layout projection is a `domMax` feature, so under
`domAnimation` they were silent no-ops — dead code that looks alive.

Reduced motion is read once in the shell and threaded down as `calm`. Under it every variant
collapses to a plain opacity crossfade — not "faster", because a fast slide is still a slide, and
translation is the specific thing that triggers vestibular symptoms.

## 7.3 The verdict, and the line it will not cross

`wizard/assessPack.ts` judges the pack **as a purchase**: does it contain the categories the stated
goal is usually built from, does it contain more than one kind of thing, where does it sit on the
discount ladder, is delivery free. Every rule could be recomputed by hand from the cart and the
category list — if one cannot be, it does not belong there.

It does not judge the pack as a nutrition plan. "This covers your protein needs" would require
protein-per-serving, servings per tub and intake from food, none of which this project holds. The
needs check states a daily range from published equations (Mifflin-St Jeor 1990, ISSN 2017, both
cited on screen) and stops. Joining the two is the visitor's judgement, with both halves visible.

The coach is an **inline SVG, not the requested PNG**. A photorealistic person beside a calorie
figure implies a real practitioner standing behind it; a drawn figure says "a guide" without saying
"a clinician". `wizard/CoachFigure.tsx` is the single place to swap if the owner would rather use a
photograph of an actual coach from the shop.

## 7.4 What a 25-agent adversarial review found

Five reviewers, one per dimension; every candidate finding then attacked by a separate skeptic
instructed to refute it. **32 candidates → 20 verified → 16 confirmed, 4 refuted.** Fixed:

| Severity | Defect |
|---|---|
| high | **Emptying the pack displayed a price.** The `items.length === 0` branch returned *before* the token bump, so that one transition left an in-flight quote unguarded and its response overwrote `setQuote(null)`. The recap read "Aucun produit sélectionné" and "Total 179.55 DT" at the same time. |
| high | **A product in two categories counted as two.** `gainers-proteines` and `prise-de-masse` are not disjoint — the latter resolves to the *parent* category. Verified against the live API: five shared product ids. One tub reported "2 catégories différentes", and the same tub appeared on two different steps. Deduped at the source in `page.tsx`. |
| high | **"Votre pack est complet" for an unpriced pack.** `nextTier === null` means either "top tier reached" *or* "no quote yet / request failed". It was read only as the first. Now gated on an explicit `hasQuote`. |
| high | **"Calculer mes besoins" did nothing on a blank field.** `validateProfile` only reports out-of-range values, and was only called once every field was filled. No result, no message, no focus move — the only available conclusion was that the feature is broken. |
| high | **The forward button was unreachable at 640–767px.** The reserve dropped to 64px at `sm`, but `MobileTabBar` is `md:hidden` and the pack bar stacks on it — ~151px of obstruction. Now steps at `md`, not `sm`. |
| high | **Focus was dumped on `<body>` at every step change**, and nothing was announced. `AnimatePresence` unmounts the control just activated. Focus now moves to a `role="status"` element that reads "Étape 2 sur 8 : Objectif". |
| medium | **No `<h1>` from step 1 onward** — it lived inside `StepWelcome`, which unmounts. Moved to the shell: full size on welcome, `sr-only` after. |
| medium | **Twelve buttons all called "Ajouter"** in the screen-reader element list. Each now carries the product name as its accessible name. |
| medium | **Progress-rail segments were 30px-wide tap targets**, eight of them, between identical neighbours. Made decorative — back, Continuer, Terminer and the recap chips already cover every navigation. |
| medium | **Calculated targets rendered silently.** Now `role="status"`. |

Refuted and deliberately unchanged: a claimed z-index conflict between the pack bar and the tab bar
(paint order is unambiguous); a claimed memo failure (the boundary demonstrably skips); a claimed
unreachable "Continuer" caused by the site footer (the footer sits below and supplies the scroll);
and a claim that the hardcoded tier mirror is unfalsifiable (it is not — a server quote contradicts
it visibly).

**Known and accepted:** `PACK_TIERS` and the 300 DT free-delivery threshold are hardcoded mirrors of
backend values. If the backend changes them, the welcome step advertises the old offer until this
file is updated. Fixing it properly needs an endpoint that publishes the ladder; recorded here
rather than silently carried.

## 7.5 Verification

`node scripts/check-packbuilder.mjs --base <url>` — **54 assertions, all passing.** It walks the
flow the way a customer does, and three of its sections exist because the claim behind them was
wrong at least once:

- **SEO with JavaScript disabled** — a client wizard can silently move the `<h1>` and every internal
  link behind a click, and nothing visible breaks when it does. Asserted: one `<h1>`, visible, naming
  the page; 1,881 characters of prose; all five category links crawlable.
- **The calculator's arithmetic, by hand** — a 30y / 178cm / 80kg male must produce **1,770 kcal**
  BMR and **128–176 g** protein. A calculator that renders a plausible *wrong* number is worse than
  one that renders nothing, because people act on it.
- **Transferred JavaScript, cache disabled** — three consecutive runs reported 246.7, 189.4 and
  362.5 kB for identical code before `setCacheEnabled(false)`, because a cached response carries no
  body. A gate whose value depends on how recently you last ran it will eventually "prove" that a
  regression is fine. Stable now: **1,176 kB uncompressed**, identical across runs.

Plus: `audit-contrast` 0 failures in both themes at 1440 and 390 · `lint:design` clean · `tsc` clean ·
build clean · route still statically prerendered · **56.9 kB / 212 kB**, against `/shop` at 216 kB
and `/checkout` at 208 kB.

## 7.6 Accès Pro left this page

Owner: *"the Accès Pro button should be beside the composez votre pack in the header… the page of
generating a pack is only for generating a pack."* It is now in the desktop nav (16px from the pack
CTA, outlined so the row still has exactly one button that sells) and has a row in the mobile
sidebar. A B2B signup link is navigation — it belongs wherever you are on the site, not stapled to
one page's heading where it competed with that page's own first action.
