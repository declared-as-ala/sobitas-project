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
| Requires the Laravel scheduler to be running on the host (cron entry
| `* * * * * php artisan schedule:run` or a `schedule:work` process). Both
| commands are idempotent and safe to run manually at any time.
*/
Schedule::command('seo:health-report')->weeklyOn(1, '06:00'); // Monday summary of missing SEO data (logged)
Schedule::command('seo:enrich-nutrition --limit=25')->weeklyOn(2, '03:00'); // gradual factual nutrition enrichment (OFF, by GTIN)
