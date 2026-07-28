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

Schedule::command('seo:health-report')->weeklyOn(1, '06:00'); // Monday summary of missing SEO data (logged)
Schedule::command('seo:enrich-nutrition --limit=25')->weeklyOn(2, '03:00'); // gradual factual nutrition enrichment (OFF, by GTIN)
