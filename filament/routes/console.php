<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Console Routes
|--------------------------------------------------------------------------
|
| This file is where you may define all of your Closure based console
| commands. Each Closure is bound to a command instance allowing a
| simple approach to interacting with each command's IO methods.
|
*/

Artisan::command('inspire', function (): void {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| SEO automation schedule
|--------------------------------------------------------------------------
| Runs in the `sobitas-backend-v2-scheduler` container (docker-compose.yml),
| which executes `php artisan schedule:work`.
|
| That container did not exist until 2026-07-28. Everything below was defined
| but had NEVER RUN — a scheduler entry with nothing to execute it is silent,
| which is the same failure mode as the SEO bugs these commands exist to catch.
| If schedule entries appear to do nothing, check that container first.
|
| Every command here is idempotent, read-mostly, and safe to run by hand.
*/

// The watchdog. Fetches the live site AS GOOGLEBOT and checks the invariants that broke silently
// before: sitemap size, canonical health, noindex leaks, bot-vs-human divergence, image
// crawlability, and fabricated review markup. Fails loudly in the log so a regression surfaces in
// a day rather than a quarter. Runs early, before traffic.
Schedule::command('seo:health-check')->dailyAt('05:30')->withoutOverlapping();

// Fills any SEO field that has gone blank. The observers cover admin saves; this covers imports,
// direct SQL, restores and bulk edits, which all bypass model events.
Schedule::command('seo:self-heal')->dailyAt('04:30')->withoutOverlapping();

// Reports published reviews with no purchase evidence. Report-only: unpublishing is a deliberate
// act behind --unpublish-unattested --force, never something a schedule should do on its own.
Schedule::command('seo:audit-reviews')->weeklyOn(1, '05:00');

// The review-request engine. Every product currently shows no stars because the 203 reviews that
// were there had no purchase behind any of them and had to come down; genuine reviews are the only
// way stars come back, and this is what asks for them. Sends to orders delivered
// reviews.request_delay_days ago, capped and windowed — see the command's docblock.
//
// 10:00 local is deliberate: a review request that lands at 04:00 gets buried by morning mail.
Schedule::command('reviews:send-due-requests')->dailyAt('10:00')->withoutOverlapping();

Schedule::command('seo:health-report')->weeklyOn(1, '06:00'); // Monday summary of missing SEO data (logged)
Schedule::command('seo:enrich-nutrition --limit=25')->weeklyOn(2, '03:00'); // gradual factual nutrition enrichment (OFF, by GTIN)

// Promote barcodes that are already in code_product/sku into the gtin column. Report-only on a
// schedule: --apply is withheld deliberately, because the command also surfaces conflicting and
// duplicate barcodes, and resolving those is a judgement call rather than something a cron should
// decide. Without this the drift is invisible — seo:enrich-nutrition above simply finds nothing.
Schedule::command('products:recover-gtin')->weeklyOn(2, '02:30');

// Supplement Facts from the NIH label database, transcribed rather than generated.
//
// Runs BEFORE seo:enrich-nutrition on the same night, because DSLD carries the actual printed
// supplement panel — serving size, every ingredient row, %DV — while Open Food Facts carries
// per-100 g food values. For a tub of whey the label panel is the better answer, so it goes first
// and OFF fills in only what is still empty.
//
// --apply IS passed here, unlike products:recover-gtin, because this command publishes only on a
// barcode match. A name-only match records a pending observation and touches no product, so the
// worst a cron can do is queue something for a human to look at.
//
// ── MOVED, NOT DELETED ────────────────────────────────────────────────────────────────────
// This entry used to be `weeklyOn(2, '02:45')` with --limit=25. It now lives in the catalogue
// block further down, daily at 02:20 with a larger limit, because the population it can serve
// changed: page transcription captures the barcode and promotion copies it to `products.gtin`, so
// there are now thousands of barcoded products for it to match on instead of the twelve the legacy
// catalogue carried.
//
// It is defined in ONE place. Two Schedule::command() entries for the same command do not merge —
// they both run — and this repository has already lost a day to a duplicate declaration silently
// doubling a rate (config/enrichment.php had `iherb.com` twice, so the documented pace was wrong
// by 5x for weeks). See the "Supplement Facts for the imported catalogue" block below.

// Draft copy for thin product pages. 15 a week, queued one job per product.
//
// The rate is the point. 95 of 309 products are under 250 words, and clearing that in one sweep is
// exactly the shape Google's scaled-content-abuse policy targets. Drafts are also invisible until
// a human approves them in Filament, so this only ever builds a small review queue — it never
// publishes. If nobody is reviewing, drafts accumulate harmlessly and the schedule is self-limiting
// because --regenerate is not passed: a product with a pending draft is skipped.
Schedule::command('products:generate-content --limit=15 --max-words=250')
    ->weeklyOn(3, '03:30')
    ->withoutOverlapping();

/*
|--------------------------------------------------------------------------
| External catalogue acquisition (iHerb)
|--------------------------------------------------------------------------
| These two entries are what make the import self-driving. Neither is
| customer-visible: both write only to `external_catalog_products`, and no
| product, page or URL is created by either one. Promotion — the step that
| does create products — is deliberately absent from this file and stays a
| command someone runs on purpose.
|
| Gated on catalog.autorun (CATALOG_AUTORUN), so the whole pipeline has a
| single off switch that does not require editing code.
*/

// Enumerate the catalogue from iHerb's published sitemaps: three HTTP requests
// for ~47,537 products, because the id is in the URL. Idempotent — the unique
// key means a re-run refreshes URLs and never duplicates a row, and it never
// resets the status of a row that has already been hydrated or promoted.
//
// TWO entries, because "weekly" alone has a hole in it. A weekly-on-Sunday
// schedule deployed on a Monday does nothing at all for six days, and the whole
// pipeline downstream would sit idle waiting for rows that nobody had asked for
// yet. So:
//
//   · the bootstrap runs HOURLY but only while the staging table is empty, which
//     means it fires within the hour of the first deploy and then stops being
//     eligible forever — no flag to set, no state to remember
//   · the refresh runs weekly to pick up products iHerb has added since
//
// The `hasTable` guard matters: the scheduler container starts alongside the
// backend, and on the very first deploy it can evaluate this before the
// migration has created the table.
$catalogueReady = fn () => (bool) config('catalog.autorun', true)
    && \Illuminate\Support\Facades\Schema::hasTable('external_catalog_products');

Schedule::command('catalog:iherb:discover')
    ->hourly()
    ->withoutOverlapping()
    ->when(fn () => $catalogueReady()
        && \App\Models\ExternalCatalogProduct::query()->doesntExist());

Schedule::command('catalog:iherb:discover --refresh')
    ->weeklyOn(0, '02:00')
    ->withoutOverlapping()
    ->when($catalogueReady);

// Refill the hydration window. Each run dispatches a bounded batch; the database
// stays the record of what is left, so a queue flush or a dead worker loses
// nothing — the rows are still in their state and the next run picks them up.
//
// Ten minutes is matched to the pace, not picked for neatness: 250 products at
// the configured 0.5 req/s is ~8.3 minutes of work for the queue worker, so the
// window refills just after it drains rather than piling up in Redis.
Schedule::command('catalog:iherb:hydrate --include-neutral')
    ->everyTenMinutes()
    // BOUNDED. `withoutOverlapping()` with no argument expires after 24 HOURS, so a deploy that
    // recreates the container mid-run leaves a mutex nothing releases and the pass is silently
    // dead until tomorrow. This dispatches a bounded window and returns in seconds; 15 minutes is
    // already generous, and the failure it prevents is a day of nothing with no error anywhere.
    ->withoutOverlapping(15)
    ->when($catalogueReady)
    // EVIDENCE. Both catalogue passes ran unattended and wrote NOTHING - no output log, no
    // onFailure - which is why a scheduler that could not reach Redis, and therefore never
    // executed a single command, was indistinguishable from one working perfectly for hours.
    // Every other entry in this file already had one or the other; the two doing the actual work
    // had neither.
    ->appendOutputTo(storage_path('logs/catalog-hydrate.log'))
    ->onFailure(function (): void {
        \Illuminate\Support\Facades\Log::error(
            'catalog:iherb:hydrate FAILED on the schedule - the import is not progressing. '
            .'See storage/logs/catalog-hydrate.log.',
        );
    });

// Read the product PAGES. This is the pass that produces actual content: the
// overview, the directions, the ingredients, the warnings, the Supplement Facts
// panel, the image gallery and — the field that unblocks products:enrich-dsld
// and seo:enrich-nutrition — the barcode. The identity JSON hydration fetches
// carries none of it.
//
// ── WHY IT IS OFFSET FROM HYDRATION AND NOT ON THE SAME TICK ──────────────
// Both passes now talk to iHerb, under two different hostnames (tn.iherb.com
// for the JSON, fr.iherb.com for the page). PoliteFetcher paces them in ONE
// shared bucket, so running them together is safe — it simply halves each. The
// five-minute offset is so the two windows interleave rather than contend for
// the same worker at the same instant, and so `--status` on either pass shows
// movement attributable to that pass.
//
// Writes only to `external_catalog_products`. No product changes, no page
// appears, no URL moves — the same reason discovery and hydration are allowed
// to run unattended and promotion never will be.
// `cron()` rather than `everyTenMinutes()->at(...)`: `at()` sets a time of day
// and is silently ignored on a sub-hourly frequency, so the offset this comment
// describes would not have existed. The expression says what it does.
// ── `--include-filtered`: READ EVERY PRODUCT'S PAGE, INCLUDING THE ONES THE SLUG PREFILTER
//    SET ASIDE ────────────────────────────────────────────────────────────────────────────
// The owner's instruction is explicit and repeated: do not filter anything out of the import.
// Without this flag the pass only ever reads pages for `hydrated` and `promoted` rows, so several
// thousand `filtered_out` rows would never have their content read at all — and the prefilter that
// set them aside is a KEYWORD match on a URL slug, which is a cheap heuristic, not a verdict.
//
// It costs nothing that matters and risks nothing that is visible:
//   · scopeAwaitingContent() orders `promoted` → `hydrated` → `filtered_out`, so the products that
//     are actually live keep their place at the front of the queue and gain no latency from this
//   · the pass writes ONLY to `external_catalog_products`. Reading a page does not create a
//     product, a URL or a page — promotion still requires a classified subcategory, so a shampoo
//     whose page we read remains unsellable and unpublished exactly as before
//
// So the flag buys back the rows a keyword guessed wrong about, and leaves the gate that actually
// protects the storefront untouched.
Schedule::command('catalog:iherb:content --include-filtered')
    ->cron('5-59/10 * * * *')
    ->withoutOverlapping(15)
    ->when($catalogueReady)
    ->appendOutputTo(storage_path('logs/catalog-content.log'))
    ->onFailure(function (): void {
        \Illuminate\Support\Facades\Log::error(
            'catalog:iherb:content FAILED on the schedule - no product content is being read. '
            .'See storage/logs/catalog-content.log.',
        );
    });

/*
|--------------------------------------------------------------------------
| Publication: turning transcribed pages into pages a customer can see
|--------------------------------------------------------------------------
| Everything above writes ONLY to `external_catalog_products`. The three
| entries below are the ones that create and publish products, and they were
| deliberately absent from this file until now — the header of the block above
| says so, and the reason was sound: with no page content transcribed, every
| promoted product would have been a thin page, and ~19,000 thin pages is the
| shape Google's scaled-content-abuse policy targets.
|
| That premise no longer holds. `catalog:iherb:content` transcribes the
| manufacturer's own overview, directions, ingredients, warnings and Supplement
| Facts panel from the product page, so a promoted product now carries real
| copy. The owner has asked, repeatedly and explicitly, for the pipeline to
| publish without a human in the loop.
|
| ── WHAT MAKES THAT SAFE IS THE GATE, NOT THE CADENCE ─────────────────────
| PromotionGate still decides, unchanged: a row is promotable only with a
| mapped subcategory, a computed price, a brand, a cover image and a
| completeness score, and never when discontinued. Separately, the MEASURED
| body gate decides `seo_robots_index` — a product whose transcribed body is
| under catalog.promotion.min_body_words is published but NOT offered to search
| engines, and `--reindex` promotes it later if its body grows.
|
| So the worst case of running this unattended is a sellable product page that
| Google is not yet told about. That is recoverable. The failure it is worth
| protecting against — thin pages entering the index at scale — is exactly what
| the gate refuses, and no entry here passes --force-index.
*/

// 1. Rewrite the bodies of products promoted BEFORE their page had been read.
//
// 812 products were promoted while the content pass was failing, so their bodies are the composed
// fact block alone. --recompose replaces those with the transcribed manufacturer copy now sitting on
// the staging row. It creates nothing, publishes nothing, and never overwrites a body a human has
// edited, which is why it can run unattended ahead of the wave below.
Schedule::command('catalog:iherb:promote --recompose')
    ->hourlyAt(20)
    ->withoutOverlapping(30)
    ->when($catalogueReady)
    ->appendOutputTo(storage_path('logs/catalog-publish.log'));

// 2. Publish a bounded wave.
//
// --publish re-measures already-published noindexed products first, then clears the backlog an
// earlier run left unpublished, then publishes what this run creates. The wave is bounded by
// --limit deliberately: a wave is observable in Search Console and reversible, and an unbounded
// nightly publish of tens of thousands of URLs is neither. Raise CATALOG_PUBLISH_WAVE once the
// first waves have been watched.
Schedule::command('catalog:iherb:promote --publish --limit='.(int) env('CATALOG_PUBLISH_WAVE', 250))
    ->hourlyAt(35)
    ->withoutOverlapping(45)
    ->when($catalogueReady)
    ->appendOutputTo(storage_path('logs/catalog-publish.log'))
    ->onFailure(function (): void {
        \Illuminate\Support\Facades\Log::error(
            'catalog:iherb:promote --publish FAILED - no new products are reaching the storefront. '
            .'See storage/logs/catalog-publish.log.',
        );
    });

// 3. Free the products held back as thin once their body clears the gate.
//
// Separate from the wave above so it still runs when the wave is a no-op, and so "a page became
// indexable" is attributable in the log to this entry rather than buried in a publish run.
Schedule::command('catalog:iherb:promote --reindex')
    ->dailyAt('03:15')
    ->withoutOverlapping(60)
    ->when($catalogueReady)
    ->appendOutputTo(storage_path('logs/catalog-publish.log'));

/*
|--------------------------------------------------------------------------
| Supplement Facts for the imported catalogue, by barcode
|--------------------------------------------------------------------------
| The page transcription captures the BARCODE (`source_gtin`), and promotion
| copies it to `products.gtin`. That is what makes this entry newly worth
| running often: products:enrich-dsld publishes a real Supplement Facts panel
| ONLY on a barcode match, and until the page pass existed the imported
| catalogue had no barcodes at all, so there was nothing for it to match on.
|
| Measured 11/08/2026 against the US brands iHerb actually sells, DSLD returns
| a correct-brand label for 28 of 30 sampled products. A name match remains a
| pending observation that publishes nothing — see DsldClient::findFor(), which
| now also refuses a candidate whose brand is not ours.
|
| Kept at a modest limit and off the hour: DSLD is a free public service run by
| the NIH and there is no deadline here worth being rude to it for.
*/
/*
 * 300 a night, up from 60, because the input side changed underneath this entry.
 *
 * catalog:iherb:import-content landed barcodes on 6,721 staging rows in one pass, and
 * `--recompose` copies each to products.gtin. At 60/night that queue drains in 112 days and the
 * catalogue is still growing; at 300 it is about three weeks.
 *
 * ── THE POLITENESS ARITHMETIC, SINCE THIS IS SOMEONE ELSE'S PUBLIC SERVICE ────────────────
 * DsldClient spaces every request by 500ms and identifies itself. findFor() spends one search plus
 * a label fetch per BRAND-MATCHED candidate — and since the brand filter went in it stops fetching
 * labels for candidates that are not ours, which is most of them, so the realistic cost is 2-4
 * requests per product. 300 products is therefore roughly 5-10 minutes of traffic, once a night,
 * against an API that publishes no rate limit at all. That is a guest's share, not a burden.
 *
 * The command only ever considers published products whose `nutrition_values` is empty, so this
 * number is a ceiling on NEW work: once the backlog is cleared the nightly run finds nothing and
 * costs one query.
 */
Schedule::command('products:enrich-dsld --limit=300 --apply')
    ->dailyAt('02:20')
    ->withoutOverlapping(90)
    ->appendOutputTo(storage_path('logs/catalog-dsld.log'));

/*
|--------------------------------------------------------------------------
| Land the harvested iHerb product content that ships with the image
|--------------------------------------------------------------------------
| WHY A FILE, WHEN catalog:iherb:content ALREADY FETCHES THIS OVER HTTP.
| Because on this deployment it does not. Measured against the live API on
| 11/08/2026, ten consecutive imported products returned
| `source_facts.content = null` and every staging column behind it was empty,
| while the SAME product pages fetch perfectly from a developer machine.
| Hydration reaches iHerb from this server (those products have prices, covers
| and subcategories); the content pass does not. The HTTP pass stays scheduled
| above and remains the right mechanism the day that changes — this entry
| simply stops customers waiting for it.
|
| Writes ONLY to `external_catalog_products`, like every other entry in the
| catalogue block. No product, price, stock or publication state is touched.
| The customer-visible effect needs no promotion: ProductDetailResource builds
| `source_facts.content` from the staging row live on every request, so a row
| that gains a gallery and a Supplement Facts panel renders them on the next
| page view.
|
| ── WHY THE LATCH IS KEYED ON THE FILE'S CONTENT HASH ─────────────────────
| The import is idempotent (a row that already has content is skipped without
| --overwrite), so a repeat run is harmless — but it is not free: it decompresses
| ~6,700 records and issues a lookup for each. Latching on a fixed key would mean
| shipping a LARGER data file later did nothing, silently, which is the failure
| mode this project keeps meeting. Keying on sha1_file() makes the marker part of
| the artefact: the same file runs once, a new file re-arms automatically, and
| nobody has to remember to clear a cache key.
|
| rescue(..., false) on both the read and the write, for the reason the research
| entry gives at length: an unreachable cache must degrade to "not yet imported"
| — the safe direction, because the cost of running again is a no-op — and must
| never throw out of a scheduled task.
*/
$catalogContentFile = base_path('database/catalog-content/iherb-content.jsonl.gz');

Schedule::command('catalog:iherb:import-content')
    ->hourly()
    ->withoutOverlapping(30)
    ->when(function () use ($catalogContentFile): bool {
        if (! is_file($catalogContentFile)) {
            return false;
        }

        $key = 'catalog.content.import.'.(rescue(fn () => sha1_file($catalogContentFile), '', false) ?: 'unknown');

        return ! rescue(
            fn () => \Illuminate\Support\Facades\Cache::has($key),
            false,
            false,
        );
    })
    ->appendOutputTo(storage_path('logs/catalog-content-import.log'))
    ->onSuccess(function () use ($catalogContentFile): void {
        $hash = rescue(fn () => sha1_file($catalogContentFile), '', false) ?: 'unknown';

        $latched = rescue(
            fn () => \Illuminate\Support\Facades\Cache::forever(
                'catalog.content.import.'.$hash,
                now()->toIso8601String(),
            ) !== false,
            false,
            false,
        );

        \Illuminate\Support\Facades\Log::info(
            $latched
                ? 'catalog:iherb:import-content ran; this data file is now marked imported. '
                    .'Output: storage/logs/catalog-content-import.log.'
                : 'catalog:iherb:import-content ran, but the completion marker could not be written '
                    .'(cache unreachable). It will run again next hour, which is a no-op for rows that '
                    .'already have content.',
        );
    })
    ->onFailure(function (): void {
        \Illuminate\Support\Facades\Log::error(
            'catalog:iherb:import-content FAILED - product pages are still missing their gallery and '
            .'Supplement Facts. See storage/logs/catalog-content-import.log.',
        );
    });

/*
|--------------------------------------------------------------------------
| One-shot: land the research content that is already committed but unimported
|--------------------------------------------------------------------------
| filament/storage/app/research.json has been in the repository since
| 2026-08-08 and has never been imported. Measured from the file itself on
| 2026-08-10: 14 products, 12 nutrition panels, 133 nutrition rows, 68 FAQ
| entries and 5 official videos — for the highest-traffic products on the
| site. That is the reason those pages look empty. The content was researched,
| adversarially re-verified, committed... and then nothing ever ran the
| importer, which is the same silent-nothing failure as a schedule with no
| runner (see the header of this file).
|
| Those are counts of what is IN the file, not a promise of what will be
| written. products:import-research re-validates every row on the way in and
| drops anything that fails — a FAQ answer whose figures contradict the panel,
| a video id that is not 11 characters of YouTube's alphabet, a nutrition row
| with no source URL. The command's own output is the record of what landed.
|
| ── WHY THE GUARD IS `is_file()` AND NOT JUST A DATE ──────────────────────
| The file is NOT in the container image. filament/.dockerignore line 21 is
| `/storage/app/*` with only `!/storage/app/.gitkeep` negated, and the
| Dockerfile's `COPY . .` honours it; the only bind-mount on this container is
| `/var/sobitas/uploads:/var/www/html/storage/app/public` — the *public*
| subdirectory, not storage/app itself. So the path below is absent on a fresh
| container and the importer would exit FAILURE with "File not found" every
| hour, for ever, in a log nobody reads.
|
| The guard makes absence a no-op instead of a recurring error. The file is
| delivered by the "Run pipeline task on VPS" workflow
| (.github/workflows/vps-run.yml), which `docker cp`s it into THIS container
| at exactly the path checked here — but only on the `research-import-apply`
| task, the one that has already passed the APPLY confirmation and taken a
| pre-command database backup. It used to be copied here on every task,
| including the ones the dropdown labels "read-only: safe to click at any
| time", which meant clicking catalog-status armed an unattended write to 14
| live product rows with no backup to roll back to. Arming an unattended
| write is itself a write, and it is now gated like one.
|
| `hourly()` rather than a fixed time: after that click the import runs by
| itself within the hour if the synchronous run was interrupted, whereas a
| daily entry armed at 06:00 would sit idle until tomorrow — the same hole
| the catalog:iherb:discover bootstrap above was written to avoid.
|
| Scheduled commands run with cwd = base_path(), so the relative path in the
| command string and storage_path('app/research.json') in the guard are
| provably the same file. They must stay that way: a guard that checks a
| different path than the command reads is a checker that never enters the
| state it is guarding.
|
| ── WHY IT IS SELF-DISABLING, AND WHY EXIT CODE 0 IS NOT ENOUGH TO LATCH ───
| The marker is written in onSuccess(), so a failed run is retried next hour
| rather than silently disabling itself. A task that switches itself off on
| failure looks identical, in the logs, to one that succeeded — and this
| project has already been bitten by "green means it worked".
|
| But onSuccess proves the command RAN, not that content LANDED, and
| ImportProductResearch::handle() returns SUCCESS unconditionally after its
| loop: a product whose slug is not found prints "introuvable", increments
| totals['skipped'] and continues, exit code still 0 (the only FAILURE paths
| are "file not found" and "no products"). research.json carries 14 exact
| `products.slug` keys, so ONE slug drifting in production meant the first run
| landed 13, skipped 1, exited 0, latched the marker for ever, and logged
| "ran once and is now disabled" — the same "green means it worked" failure
| this block claims immunity from, one level up.
|
| So the latch asserts on the ARTIFACT: every slug in research.json must
| resolve to a product row before the entry is allowed to switch itself off.
| It deliberately does NOT assert that each product ended up with a panel or a
| FAQ, because the importer legitimately drops rows that fail validation — an
| unresolvable slug is the one outcome that means "this content will never
| land without a human". When that happens the entry stays armed and logs the
| offending slugs by name every hour, which is noisy on purpose: harmless
| (without --overwrite a repeat run writes nothing) and loud, versus silent
| and permanent.
|
| The marker lives in the cache (redis, on a named volume, so it survives
| container recreation). If redis is ever flushed the import runs again, and
| that is harmless rather than a bug worth engineering around: without
| --overwrite the command skips every field that is already filled
| ("rien à écrire"), and recordProvenance() uses firstOrNew() keyed on
| (product_id, field_path, source_id, content_hash), so a repeat run cannot
| duplicate observation rows either. rescue(..., false) means "if the cache
| cannot be reached, assume not yet imported" — the safe direction, because
| the failure mode of running again is nothing. BOTH the read in when() and the
| write in onSuccess() go through it: an unreachable cache is a degraded latch,
| never an exception thrown out of a scheduled task.
|
| Deliberately NOT here: promotion and publishing. Creating and publishing
| products stays a command someone runs on purpose, exactly as the catalogue
| block above says.
*/
$researchFile = storage_path('app/research.json');
$researchImportedKey = 'research.import.completed';

/**
 * Slugs in research.json that resolve to no product row.
 *
 * This is the verification the exit code cannot give: it reads the same file the command reads and
 * asks the database whether the products it names actually exist. An empty list means every entry
 * in the file had somewhere to land; a non-empty one names exactly which content did not.
 *
 * @return list<string>
 */
$researchSlugsNotFound = function () use ($researchFile): array {
    $payload = json_decode((string) file_get_contents($researchFile), true);
    $products = $payload['products'] ?? $payload;

    if (! is_array($products) || $products === []) {
        // Unreadable or empty: the command would have exited FAILURE, so onSuccess should not be
        // running at all. Report it as unverified rather than as "everything landed".
        return ['<research.json unreadable or empty>'];
    }

    $missing = [];

    foreach ($products as $entry) {
        $slug = is_array($entry) ? trim((string) ($entry['slug'] ?? '')) : '';

        if ($slug === '') {
            continue;
        }

        if (! \App\Models\Product::query()->where('slug', $slug)->exists()) {
            $missing[] = $slug;
        }
    }

    return $missing;
};

Schedule::command('products:import-research storage/app/research.json --apply')
    ->hourly()
    ->withoutOverlapping()
    ->when(fn () => is_file($researchFile)
        && ! rescue(
            fn () => \Illuminate\Support\Facades\Cache::has($researchImportedKey),
            false,
            false,
        ))
    ->appendOutputTo(storage_path('logs/research-import.log'))
    ->onSuccess(function () use ($researchImportedKey, $researchSlugsNotFound): void {
        // Exit code 0 only proves the command RAN. Check the artifact before switching the entry
        // off for ever — see the header block above for the run that lands 13 of 14 and latches.
        $missing = rescue($researchSlugsNotFound, null, false);

        if ($missing === null) {
            \Illuminate\Support\Facades\Log::warning(
                'products:import-research exited 0 but its result could not be verified '
                .'(research.json or the database was unreachable from the scheduler). '
                .'NOT disabling the entry — it will run again next hour.',
            );

            return;
        }

        if ($missing !== []) {
            \Illuminate\Support\Facades\Log::error(sprintf(
                'products:import-research exited 0, but %d slug(s) in research.json match no product: %s. '
                .'That content has NOT landed, so the entry stays armed and will retry next hour. '
                .'Fix the slug in research.json (or rename the product back) — nothing changes until you do. '
                .'Output: storage/logs/research-import.log.',
                count($missing),
                implode(', ', array_slice($missing, 0, 20)),
            ));

            return;
        }

        /*
         * SYMMETRIC WITH THE READ IN when(), AND FOR THE SAME REASON.
         *
         * The guard above already reads this key through rescue(): an unreachable cache there means
         * "assume not yet imported" instead of an exception. This write did not have the same
         * protection, so the one moment the cache being down became FATAL was the end of a run that
         * had just succeeded — an uncaught exception out of a scheduled task's onSuccess callback,
         * from a schedule:work process, over content that had already landed correctly. A read that
         * degrades and a write that throws are not two policies; they are one policy applied once.
         *
         * rescue(..., false) makes an unreachable cache mean "not latched", the same safe direction
         * the read takes: the entry stays armed and next hour's run is a no-op that writes nothing
         * (without --overwrite the importer skips every field that is already filled, and
         * recordProvenance() is keyed so a repeat cannot duplicate observations — see the header).
         * `!== false` because a driver that refuses the write reports it in the return value rather
         * than by throwing, and a refused write must not be logged as a latch that happened.
         */
        $latched = rescue(
            fn () => \Illuminate\Support\Facades\Cache::forever($researchImportedKey, now()->toIso8601String()) !== false,
            false,
            false,
        );

        if (! $latched) {
            \Illuminate\Support\Facades\Log::warning(
                'products:import-research succeeded and every slug in research.json resolved to a product, '
                ."but the completion marker [{$researchImportedKey}] could not be written (cache unreachable "
                .'or the write was refused). The entry stays armed: it will run again next hour, which is '
                .'harmless — without --overwrite a repeat run writes nothing. '
                .'Output: storage/logs/research-import.log.',
            );

            return;
        }

        \Illuminate\Support\Facades\Log::info(
            'products:import-research ran, every slug in research.json resolved to a product, and the '
            .'entry is now disabled. Output: storage/logs/research-import.log. '
            ."To run it again, forget the cache key [{$researchImportedKey}] — the "
            .'"research-import-rearm" task in the "Run pipeline task on VPS" workflow does exactly that.',
        );
    })
    ->onFailure(function (): void {
        // Loud on purpose. The whole point of this entry is that content lands without
        // anyone watching, so the one thing that must never be quiet is it not landing.
        \Illuminate\Support\Facades\Log::error(
            'products:import-research FAILED — content did not land. It will be retried next hour. '
            .'See storage/logs/research-import.log.',
        );
    });
