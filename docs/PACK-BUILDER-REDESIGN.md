# /pack-builder — the study, the decisions, and what shipped

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
