<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function (): void {
            Route::prefix('api')
                ->middleware('api')
                ->namespace($this->namespace)
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->namespace($this->namespace)
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * WHY THIS IS NO LONGER A FLAT 60/min
     * -----------------------------------
     * Every server-rendered page on protein.tn fans out to several calls against this
     * API, and they all reach Laravel from ONE source IP (the Next.js renderer). A flat
     * 60 req/min bucket keyed on that IP therefore capped the entire storefront at
     * roughly one page render per second. Measured consequence: during a crawl at
     * concurrency 10, 135 of 520 sitemap URLs returned 500 (0 of 40 failed
     * sequentially) because the backend answered 429 and the renderer surfaced it as a
     * 500 — and the pages that DID render while throttled shipped a generic <title>
     * and no canonical. Rate limiting was a direct cause of an indexing problem.
     *
     * Two buckets now, with SEPARATE keys so they cannot drain each other:
     *   • GET/HEAD (catalogue reads: what Googlebot and browsers generate, cheap and
     *     mostly cached behind cache.api) -> generous ceiling.
     *   • POST/PUT/PATCH/DELETE (orders, coupons, contact, newsletter, auth)
     *     -> UNCHANGED 60/min.
     *
     * /login and /register keep their own route-level throttles (throttle:10,1 and
     * throttle:5,1 in routes/api.php); those stack on top of this and are untouched.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            // Union with defaults so this still behaves sanely if deployed against a
            // config cache that predates the config/app.php change.
            $config = ((array) config('app.api_rate_limit', [])) + [
                'read' => 600,
                'write' => 60,
            ];

            $key = optional($request->user())->id ?: $request->ip();

            // isMethodCacheable() is GET + HEAD only.
            return $request->isMethodCacheable()
                ? Limit::perMinute((int) $config['read'])->by('api-read:'.$key)
                : Limit::perMinute((int) $config['write'])->by('api-write:'.$key);
        });
    }
}
