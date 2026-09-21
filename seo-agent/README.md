# seo-agent — the cloud SEO routine's memory and tools

A claude.ai **cloud routine** ("SEO expert — protein.tn", daily, Opus) clones this repo every
morning, reads this folder, does one day of senior-SEO work and pushes a `claude/seo-daily-<date>`
branch. `.github/workflows/seo-agent-land.yml` gates it, merges it to `main`, deploys, runs the
VPS tasks it queued and reverts if a deploy fails. No PC, no permission prompts, no PR to review.

| file | role |
| --- | --- |
| `PLAYBOOK.md` | the operating manual — what to do every run, in order, and the gates |
| `BACKLOG.md` | prioritized work; the routine updates it every run |
| `KEYWORDS.md` | target queries, the page that should rank, last observed positions |
| `watchlist.txt` | URLs audited every morning (Googlebot UA) |
| `ops/queue.txt` | VPS tasks to run after landing (allow-listed in the land workflow) |
| `log/YYYY-MM-DD.md` | one entry per run — read the newest two to see what happened |
| `tools/audit-live.mjs` | live SEO surface audit; exit 1 on a P0 |
| `tools/gsc.mjs` | Search Console pull (needs `GSC_SERVICE_ACCOUNT_JSON_B64` in the cloud env) |
| `data/gsc-latest.json` | compact output of the last GSC pull (overwritten) |

Product content lever: `filament/resources/seo/products/*.json` → `php artisan
seo:products-apply-copy --apply` (vps-run task `seo-copy-apply`).

Owner-side one-offs (cannot be automated from the repo): connect GitHub on claude.ai Code so the
routine can clone; set the cloud environment's network access to **Full** (it must reach
protein.tn, admin.protein.tn, Google); optionally add the GSC service-account credential.
