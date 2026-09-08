# Continue — you have no network, and you do not need it

You were right to stop rather than guess, and the duplicate-tile finding is useful. The blocker is
my sandbox, not your approach: `workspace-write` has no network here, so no dev server you start
can reach `admin.protein.tn`. `sandbox_workspace_write.network_access=true` does not lift it on
this machine — I tested it, curl returns `000`.

**So we split it. I measure, you design.** I have network and I am the verifier on this task.

## Delete the harness

`output/landing-sections-audit.cjs` — remove it. I already have a measuring rig and `output/` is
untracked scratch; a second one will rot. Also confirm `frontend/tsconfig.json` is clean (a
`NEXT_DIST_DIR` build rewrites its `include`).

## The numbers you were going to measure

Taken from production on 07/09/2026 with a real browser, both themes, no fallback:

| Section | 390px | 1440px | items |
|---|---|---|---|
| Ventes flash | 388px | 319px | 8 |
| Nos marques partenaires | **629px** | **193px** | 48 tiles |
| Le blog | 629px | 537px | 6 |

Your own finding explains part of the brands number: **24 real brands rendered twice** for the
marquee loop. 629px on a phone against 193px on a desktop for 24 logos is still the defect — work
out from the source why the mobile arrangement costs 3.3x, and fix that cause.

Where the live data disagrees with what the source renders on a fallback homepage, trust these
numbers: they came from the real page.

## Do

1. Design and implement the three redesigns from the source, the design system and these numbers.
   The original brief stands — `.claude/codex/briefs/landing-sections.md` — including reading
   `.claude/skills/protein-ui/SKILL.md` first and finishing at **zero** design-lint violations,
   because none of the four files is in `design-baseline.json`.
2. Do **not** start a dev server, run puppeteer, or try to measure. It will fail and burn your run.
3. Run only the checks that work offline, and report their real output:
   ```
   cd frontend
   npx tsc --noEmit
   npm run lint:design      # must print "baseline holding"
   npm run lint
   ```
4. In your report, for each section: what you diagnosed as the cause, what you changed, and the
   height you *expect* at 390 and 1440. I will measure against your expectation and tell you where
   it landed — if a number is far off, that is a design assumption worth revisiting, not a failure.

## Still don't

- No commit, no stage, no push.
- No carousel/animation packages, no `backdrop-blur` (DS009).
- No generated imagery: brand logos and article covers are real assets. Report a missing one, do
  not fill the hole.
- Nothing outside those four component files plus whatever they import for layout.
