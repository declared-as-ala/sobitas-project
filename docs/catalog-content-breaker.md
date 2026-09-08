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

`enrichment.fetch.circuit_breaker_cooldown_seconds` is **1800**. The breaker is supposed to clear
itself twice an hour. It does clear — and is immediately re-opened:

1. The cooldown expires.
2. A backlog is always waiting, because 900 jobs are dispatched every **5** minutes while draining
   them takes **10** — the queue is filled about twice as fast as it can empty.
3. That backlog stampedes the host the instant the breaker clears.
4. Five failures re-open the breaker (`circuit_breaker_failures: 5`) for another 1800 seconds.
5. Back to 1.

The dispatch cadence guarantees a stampede at every cooldown expiry, so the breaker can never stay
closed long enough to fetch anything. **Clearing the breaker by hand does not fix this** — it
restarts the cycle at step 2.

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

## What has to be decided before anything is changed

Two possibilities, and they need different fixes:

1. **fr.iherb.com is now refusing us outright.** Then no rate change helps and the prose has to
   come from somewhere else. Worth testing with a handful of manual fetches from the VPS before
   assuming otherwise.
2. **We are stampeding a host that would otherwise serve us.** Then the fix is the dispatch
   cadence, not the breaker: dispatch no more than one drain-window's worth of work, and back off
   on re-open rather than retrying at full rate.

Either way, the sequencing is: establish which of the two it is, fix the cadence, and only then
clear the breaker — clearing it first destroys the evidence and changes nothing.

## Corrections to earlier claims in this repository

Two diagnoses recorded earlier tonight were wrong, and are corrected here rather than left
standing:

- **"the `hand_edited` skip blocks enrichment"** — no. Those 4,197 rows already clear the gate.
- **"`discover` failing is why the catalogue does not grow"** (stated in `45bad2d8`) — no. Prose
  exists for 21,273 staging rows, so acquisition is not the binding constraint. `discover
  --refresh` did fail on 06/09 and is weekly, so it will not retry until Sunday, and the guard fix
  in that commit is still correct and worth having. But it is not the reason the catalogue is
  stuck. This is.
