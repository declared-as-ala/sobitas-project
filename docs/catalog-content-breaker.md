# Why 6,566 product pages cannot leave `noindex`

**Date:** 08/09/2026
**Method:** `/api/catalog_health` on production, plus three read-only `vps-run` tasks
(`scheduler-log`, `content-log`, `queue-log`). No writing command was run.

This is the answer to *"the sitemap only has 6k and Search Console shows 20k+"*. It is not a
sitemap bug, not a word-count gate that is set too high, and not a shortage of source material.

---

## The chain, measured

```
discovered        47,910
page_fetched      26,827
page_prose        21,273     <- prose EXISTS for 21,273 staging rows
promoted          11,048
  with_prose       4,792     <- only these ever reach a product
body_over_gate     4,598
indexable          4,802  vs  noindex 6,566        (gate = 250 words)

staging.last_content_fetch = 2026-08-11 22:34:14
```

`first_starved_stage` is `null`. Every ratio looks healthy, because a chain that has stopped
moving is perfectly balanced.

## What is actually happening

`catalog:iherb:content` runs every five minutes. From `content-log`, on every tick:

```
Dispatched 900 page extraction job(s) against fr.iherb.com.
  At the configured 1.5 req/s that is about 10 minutes of queue-worker time.
```

~259,000 job dispatches a day. From `queue-log`, what those jobs do:

```
App\Jobs\ExtractExternalProductContentJob .. 1.78ms DONE
App\Jobs\ExtractExternalProductContentJob .. 0.74ms DONE
App\Jobs\ExtractExternalProductContentJob .. 1.15ms DONE
```

A real fetch at 1.5 req/s cannot complete in 0.74 ms. They return before anything reaches the
wire, at `ExtractExternalProductContentJob::handle()`:

```php
if ($fetcher->isPaused(IHerbClient::contentHost())) {
    return;
}
```

The circuit breaker is open. The job's own comment dates the opening to **11/08/2026** — which is
`last_content_fetch` to the day.

## Why a 30-minute cooldown produced a 28-day outage

**The upstream is refusing us.** Measured 08/09/2026 from a residential connection — NOT the VPS,
so this is not an IP block on our server:

```
fr.iherb.com/pr/<any product>   403   cf-mitigated: challenge
fr.iherb.com/                   200
```

Cloudflare challenges the product-page path specifically. Every fetch the pass makes lands on that
403, five of them re-open the breaker (`circuit_breaker_failures: 5`), and the remaining ~895 jobs
of the batch return in ~1 ms at the `isPaused()` guard. The next tick dispatches a fresh batch into
the same wall. The loop persists because the host says no, every time, and it will persist for as
long as that stays true.

### The cadence is NOT the problem — an earlier version of this document said it was

That claim was wrong and is corrected rather than deleted, because it is the kind of wrong that
looks convincing:

> "900 jobs are dispatched every 5 minutes while draining them takes 10, so a backlog is always
> waiting to stampede the host."

The pass is scheduled `cron('5-59/10 * * * *')` — every **ten** minutes, not five. (The error came
from reading `:05` and `:15` in the scheduler log as a five-minute interval.) And
`catalog.content.batch` is *derived*, not chosen: `ceil(CATALOG_IHERB_RPS × CATALOG_CONTENT_WINDOW)`
= `1.5 × 600` = 900 = exactly one drain window, with a long comment in `config/catalog.php`
explaining that it is computed precisely so the two numbers cannot drift apart.

So the cadence is correct, the breaker is behaving correctly, and **there is no rate change that
fixes this.** Anyone arriving here planning to lower the batch size or lengthen the interval is
about to spend a day on the wrong thing.

## Why nothing reported it

Every surface reports success, which is the whole reason this ran for four weeks:

- the scheduler prints `catalog:iherb:content ... 2 s DONE`
- the command prints `Dispatched 900 page extraction job(s)`
- each job prints `DONE`
- `check-catalog-health` printed `No stage is starved.` and exited 0

The health guard asserted only on `chain.first_starved_stage`, a ratio between adjacent stages,
which by construction cannot see a chain that has stopped moving. `45bad2d8` made it fail on a
scheduled pass whose last run ended `failed`; that is necessary but **not sufficient**, because
this pass does not report `failed`. It reports success, quickly, forever.

**A guard for this specific shape is still missing.** The honest signal is `last_content_fetch`:
if it has not moved in 24 hours while the content pass is scheduled, the pipeline is dead no
matter what any status column says.

## Measured 09/09/2026: not one held-back product qualifies

`catalog:iherb:promote --reindex` was run on production (backup
`db-pre-command-20260909-000910.sql.gz`). It re-measures every held-back product's body against
the 250-word gate and flips only what now clears it. The result:

```
0 already-published product(s) were RE-INDEXED
6,471 more were measured and are still short; nothing was written for them
```

**Zero.** Not one of the 6,471 has earned indexing since it was held back. This is the empirical
confirmation that the gate is not the problem and no flag flip fixes this — the pages have no
content, and content cannot arrive while the upstream returns 403. Anyone tempted to lower
`min_body_words` instead should note that the honest reading of this number is "6,471 pages have
nothing to say", not "the bar is too high".

It also rules out a second theory worth naming: that the recompose pass's `hand_edited` skip was
holding back rows that would otherwise qualify. If that were true, some of those 4,197 would clear
the gate on re-measurement. None do.

## What the remedy actually is

The source is gone, not throttled. That narrows it to three honest options:

1. **Get the prose from somewhere else.** Manufacturer sites are the obvious candidate. A prior
   measurement on this project put the hit rate at roughly 2 of 6 for manufacturer pages against
   0 of 9 for barcode databases, so this is real but partial: it will not cover 6,566 products.
2. **Write it.** The category guides in `frontend/content/categories/*.json` show the shape and
   the standard. This is the only option that covers everything, and it is a large content job.
3. **Accept a smaller indexable catalogue** and put the effort into the products that actually
   sell, which is what tonight's category and brand work did.

**What must NOT be done: defeating the Cloudflare challenge.** Solving or evading bot detection to
take content from a site that is refusing automated access is out of scope here and should stay
that way, regardless of how it is framed.

Whichever option is chosen, `catalog:iherb:content` should stop being scheduled while the upstream
returns 403. It currently burns ~130,000 job dispatches a day producing nothing, and — more
importantly — its permanent green status is what hid this for four weeks.

## There IS a delivery path for content, and its own escape hatch has now closed too

An earlier version of this document said the remedy needed a decision about *how* written or
sourced content would ever reach the products. That was wrong — the mechanism exists and is
purpose-built:

```
php artisan catalog:iherb:import-content --dry-run
php artisan catalog:iherb:import-content --file=database/catalog-content/iherb-content.jsonl.gz
```

`CatalogIHerbImportContent` loads harvested content into the staging table **from a JSONL file
instead of over the network**. It is idempotent (a row that already has content is skipped unless
`--overwrite`), staging-only (no product row, price, stock or publication state), French-gated
twice, and it refuses to create staging rows that do not already exist — importing content is not
allowed to become a second, unaudited discovery path. `--dry-run` reports without writing.

So anything sourced or written elsewhere can reach customers through this file. That is the answer
to "how would we ever apply new copy at scale", and it was already in the repository.

**But note why that command was written, and what has changed since.** Its docblock, dated
11/08/2026:

> the identity pass reaches iHerb from the server and the CONTENT pass does not. The same pages
> fetch perfectly from a developer machine, which is what this file carries: the extraction was
> performed elsewhere and only the result is imported here.

That escape hatch is now closed as well. Measured 08/09/2026 from a residential connection,
`fr.iherb.com/pr/<product>` returns **403 `cf-mitigated: challenge`** — the block is no longer
specific to the server, so "harvest it from a developer machine and import the file" no longer
works either. The importer remains the right delivery mechanism; what it needs is a source that
is not iHerb.

## Corrections to earlier claims in this repository

Two diagnoses recorded earlier tonight were wrong, and are corrected here rather than left
standing:

- **"the `hand_edited` skip blocks enrichment"** — no. Those 4,197 rows already clear the gate.
- **"`discover` failing is why the catalogue does not grow"** (stated in `45bad2d8`) — no. Prose
  exists for 21,273 staging rows, so acquisition is not the binding constraint. `discover
  --refresh` did fail on 06/09 and is weekly, so it will not retry until Sunday, and the guard fix
  in that commit is still correct and worth having. But it is not the reason the catalogue is
  stuck.
- **"the dispatch cadence re-opens the breaker"** (stated in the first version of this document
  and in `b5952fd7`'s message) — no. The pass runs every ten minutes and its batch is derived to
  be exactly one drain window. The upstream returns 403 behind a Cloudflare challenge, and that
  is the whole cause.
