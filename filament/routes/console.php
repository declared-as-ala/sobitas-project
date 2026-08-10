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
Schedule::command('products:enrich-dsld --limit=25 --apply')->weeklyOn(2, '02:45');

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
    ->withoutOverlapping()
    ->when($catalogueReady);
