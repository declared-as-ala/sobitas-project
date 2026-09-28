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

            /*
             * ── THE RENDERER GETS ITS OWN BUCKET ──────────────────────────────────────────
             * 600/min was still not enough, measured 28/09/2026 in the frontend container log
             * during an ordinary crawl: `[apiFetch] Unhandled ApiError { status: 429,
             * message: 'Too Many Attempts.' }` followed by Server Components render errors. A
             * crawl of 2,615 URLs at concurrency 8 got 66 sitemap URLs answering 500 and pages
             * answering 200 with no <title> or canonical. Every server render reaches this API
             * through the public /api-proxy, so with TrustProxies('*') they all resolve to the
             * VPS's own IP — one bucket for Googlebot, every visitor's page view, and the
             * renderer itself. Raising the number moves the cliff; it does not remove it.
             *
             * The renderer now proves itself with a header only it knows, and gets a separate
             * ceiling that is a runaway guard, not a throttle. Everyone else is unchanged.
             */
            $rendererToken = (string) config('app.renderer_token', '');
            $sent = (string) $request->header('X-Renderer-Token', '');
            if ($rendererToken !== '' && $sent !== '' && hash_equals($rendererToken, $sent)) {
                return Limit::perMinute((int) ($config['renderer'] ?? 20000))->by('api-renderer');
            }

            $key = optional($request->user())->id ?: $request->ip();

            // isMethodCacheable() is GET + HEAD only.
            return $request->isMethodCacheable()
                ? Limit::perMinute((int) $config['read'])->by('api-read:'.$key)
                : Limit::perMinute((int) $config['write'])->by('api-write:'.$key);
        });
    }
}
