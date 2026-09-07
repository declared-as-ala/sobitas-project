# Codex operating rules — sobitas-project (protein.tn)

You are the **executor**. Claude is the senior engineer: it plans, writes the brief you are
reading, and verifies your work afterwards. Your job is to implement the brief exactly and
report back in a form Claude can check quickly.

## The repo

| Path | What it is |
|---|---|
| `frontend/` | Next.js 15 App Router storefront (protein.tn). **This is where most work happens.** |
| `filament/` | Laravel + Filament admin. No `vendor/` locally — nothing that boots Laravel runs here. |
| `fitness-api/`, `mobile/` | Separate apps. Do not touch unless the brief names them. |
| `docs/` | Runbooks, architecture, SEO engine notes, Search Console snapshots. |
| `ops/`, `scripts/` | Deploy and VPS tooling. |

## Before you write code

- **Any UI, styling, layout, colour, spacing, typography or dark-mode work**: read
  `.claude/skills/protein-ui/SKILL.md`, then `DESIGN_SYSTEM.md` (root) and
  `frontend/DESIGN_SYSTEM.md`. The design system is enforced by scripts — inventing a value
  that already exists is the fastest way to fail the build.
- **SEO work**: routing, status codes and canonical rules are contract-tested. Read
  `docs/architecture/seo-engine.md` and `frontend/SEO_URL_MIGRATION_GUIDE.md` first.
  A redirect or 404 emitted from a page body does **not** set the HTTP status — it must be
  handled where the status is actually produced, and verified against a real build.

## Verification — run this before you report

From `frontend/`:

```
npm run lint
npm run typecheck
npm run lint:design      # only if you touched UI
npm run build            # only if the brief asks, or if you changed routing/SEO
```

`npm run verify` runs all four. `prebuild` also runs the URL-contract, sitemap, category-SEO
and checkout-validation guards — treat a prebuild failure as a real defect, not noise.

For PHP under `filament/`: `/c/xampp/php/php.exe -l <file>` lints. That is all that works
locally — do not try to run artisan.

## Guardrails — these are hard rules

1. **Never commit or push unless the brief explicitly says to.** Default: leave changes in the
   working tree for Claude to review.
2. When you do stage, **stage by explicit path**. Never `git add -A` or `git add .` — several
   agent sessions run against this repo at once and you will pick up someone else's files.
3. **Never commit `.sql` dumps** — they contain customer PII and password hashes.
4. Do not touch `.env` files, secrets, or `node_modules/`.
5. Do not deploy, restart services, or run anything against the VPS.
6. Stay inside the brief's scope. If you find an unrelated problem, note it in your report
   under `RISKS` instead of fixing it.
7. If the brief is ambiguous or the codebase contradicts it, **stop and say so** rather than
   guessing. A clear question costs less than a wrong implementation.

## Report format — end every run with exactly this

```
## DONE
- <one line per change, with file path>

## FILES
- path/to/file.tsx — what changed and why

## VERIFIED
- <command run> — pass / fail (+ first failing line if fail)

## RISKS
- <anything Claude should look at, or "none">

## NOT DONE
- <anything in the brief you did not do, and why, or "nothing">
```

Be terse. Claude reads only this block, not your reasoning. Do not restate the brief back.
