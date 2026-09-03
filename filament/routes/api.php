<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ApisController;
use App\Http\Controllers\Api\CatalogHealthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CommandeController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\PackController;
use App\Http\Controllers\Api\PointsController;
use App\Http\Controllers\Api\ProductFeedController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ReviewThreadController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes replicate the legacy backend/ API endpoints exactly,
| so the Next.js frontend continues working without changes.
|
*/

// ── Cached Public Routes (5 min TTL) ─────────────────
// These endpoints serve static/semi-static content
Route::middleware(['cache.api:300', 'cache.headers.api:300'])->group(function () {
    Route::get('/accueil', [ApisController::class, 'accueil']);
    Route::get('/home', [ApisController::class, 'home']);
    Route::get('/categories', [ApisController::class, 'categories']);
    Route::get('/slides', [ApisController::class, 'slides']);
    Route::get('/coordonnees', [ApisController::class, 'coordonnees']);
    Route::get('/media', [ApisController::class, 'media']);
    Route::get('/all_brands', [ApisController::class, 'allBrands']);
    Route::get('/aromes', [ApisController::class, 'aromes']);
    Route::get('/tags', [ApisController::class, 'tags']);
    Route::get('/services', [ApisController::class, 'services']);
    Route::get('/faqs', [ApisController::class, 'faqs']);
    Route::get('/pages', [ApisController::class, 'pages']);
    Route::get('/navigation-items', [ApisController::class, 'navigationItems']);
    Route::get('/redirections', [ApisController::class, 'redirections']);
    Route::get('/latest_articles', [ApisController::class, 'latestArticles']);
    Route::get('/blog_categories', [ApisController::class, 'blogCategories']);
    Route::get('/blog_tags', [ApisController::class, 'blogTags']);
    Route::get('/latest_products', [ApisController::class, 'latestProducts']);
    Route::get('/latest_packs', [ApisController::class, 'latestPacks']);
    Route::get('/new_product', [ApisController::class, 'newProduct']);
    Route::get('/best_sellers', [ApisController::class, 'bestSellers']);
    Route::get('/packs', [ApisController::class, 'packs']);
    Route::get('/ventes_flash', [ApisController::class, 'flash']);
});

// ── Short-cached Public Routes (1 min TTL) ───────────
// These depend on dynamic parameters but can still be cached briefly
// NOTE: Compression removed from PHP level - use Nginx gzip instead (faster)
Route::middleware(['cache.api:60', 'cache.headers.api:60'])->group(function () {
    Route::get('/product_details/{slug}', [ApisController::class, 'productDetails']);
    Route::get('/article_details/{slug}', [ApisController::class, 'articleDetails']);
    Route::get('/productsByCategoryId/{slug}', [ApisController::class, 'productsByCategoryId']);
    /*
     * ── A LETTER IN A NUMERIC SEGMENT WAS A 500, NOT A 404 ──────────────────────────────────
     * Verified against live on 20/08/2026, unauthenticated:
     *
     *     GET /api/productsByBrandId/abc   -> 500
     *     GET /api/similar_products/abc    -> 500
     *     GET /api/commande/abc            -> 500
     *
     * The controllers type-hint `int $id`, so PHP throws a TypeError before any of their own
     * validation runs. Three consequences, and the third is the one that matters: the caller gets
     * a server error for what is plainly a client mistake; every crawler and scanner that walks
     * these URLs writes a stack trace into laravel.log, burying the real errors; and a 500 tells
     * Google the endpoint is broken rather than that the URL is wrong.
     *
     * `whereNumber` makes the route simply not match, which is a 404 — the correct answer, and
     * one that costs nothing to produce. Applied to every numeric segment in this file rather than
     * only the three that were reported, because the next one is the same bug.
     */
    Route::get('/productsByBrandId/{brand_id}', [ApisController::class, 'productsByBrandId'])->whereNumber('brand_id');
    Route::get('/productsBySubCategoryId/{slug}', [ApisController::class, 'productsBySubCategoryId']);
    Route::get('/similar_products/{sous_categorie_id}', [ApisController::class, 'similar_products'])->whereNumber('sous_categorie_id');
    Route::get('/seo_page/{name}', [ApisController::class, 'seoPage']);
    Route::get('/page/{slug}', [ApisController::class, 'getPageBySlug']);
    Route::get('/all_products', [ApisController::class, 'allProducts']);
    // Filter-sidebar facets over the whole published catalogue (price bounds, flavours, counts).
    // Needed because /shop now paginates on the server: see ApisController::shopFacets.
    Route::get('/shop_facets', [ApisController::class, 'shopFacets']);
    Route::get('/all_articles', [ApisController::class, 'allArticles']);
    Route::get('/blog/category/{slug}', [ApisController::class, 'articlesByBlogCategorySlug']);
    Route::get('/blog/tag/{slug}', [ApisController::class, 'articlesByBlogTagSlug']);
});

// ── FAST ROUTE (Minimal middleware) ─────────────────────────────
// Isolated route to test performance without middleware overhead
// Used for benchmarking to identify middleware bottlenecks
// Only keeps: CacheApiResponse (essential for performance) + SubstituteBindings (required for routing)
Route::get('/all_products_fast', [ApisController::class, 'allProducts'])
    ->withoutMiddleware([
        'throttle:api',
        \App\Http\Middleware\DisableDebugbarForApi::class,
        \App\Http\Middleware\RequestTimeline::class,
        \App\Http\Middleware\PerformanceProfiler::class,
    ])
    ->middleware([
        'cache.api:60',
        'cache.headers.api:60',
        \Illuminate\Routing\Middleware\SubstituteBindings::class,
    ]);

// ── Uncached Public Routes (dynamic/write operations) ─
Route::get('/searchProduct/{text}', [ApisController::class, 'searchProduct']);
Route::get('/searchProductBySubCategoryText/{slug}/{text}', [ApisController::class, 'searchProductBySubCategoryText']);
// CRIT-04: Controller validates ownership (auth user or ?email= / ?phone= for guests)
Route::get('/commande/{id}', [CommandeController::class, 'details'])->whereNumber('id');

Route::post('/add_commande', [CommandeController::class, 'storeCommandeApi']);
// Pack (bundle) tier quote — PUBLIC, server-computes discount from real prices
Route::post('/pack/quote', [PackController::class, 'quote']);
Route::post('/coupons/apply', [CouponController::class, 'apply']);
Route::post('/coupons/remove', [CouponController::class, 'remove']);
Route::post('/newsletter', [ApisController::class, 'newsLetter']);
/*
 * Contact — PUBLIC, and it now sends two emails per call, which is exactly the shape a spam relay
 * looks for. 6/minute per IP: a person who mis-taps submit is unaffected, a script is not worth
 * running. The honeypot in sendContact() is the other half; see its docblock for why a bot that
 * trips it gets a 200.
 */
Route::middleware('throttle:6,1')->post('/contact', [ApisController::class, 'sendContact']);
// HIGH-03: Protected — auth:sanctum + admin only
Route::post('/send_mail', [ApisController::class, 'send_email'])->middleware(['auth:sanctum', 'can:accessFilament']);

// Google Merchant Center & Meta Catalog feed (public, cached 30 min)
Route::middleware(['cache.api:1800', 'cache.headers.api:1800'])->get('/merchant-feed', [ProductFeedController::class, 'feed']);

/*
 * Content-pipeline health. Aggregate COUNTS ONLY — no row, slug, URL, price or credential.
 *
 * Unauthenticated on purpose. The commands that answer these questions
 * (`catalog:iherb:content --status`, `catalog:iherb:promote --status`) all require a shell, and SSH
 * to this host has been failing on password auth since 10/08 — so on 14/08 the question "why is
 * every imported product noindexed" had to be answered by sampling /product_details forty times and
 * inferring the staging state from what did and did not appear in the payload. The pipeline had
 * excellent diagnostics and no way to read them.
 *
 * The endpoint is throttled and cached rather than gated, because a token nobody can retrieve
 * without SSH would reproduce the exact problem it exists to solve.
 */
Route::middleware(['throttle:30,1', 'cache.headers.api:300'])
    ->get('/catalog_health', CatalogHealthController::class);

// Auth — login + register throttled to blunt credential-stuffing / account spam
Route::middleware('throttle:10,1')->post('/login', [ClientController::class, 'login']);
Route::middleware('throttle:5,1')->post('/register', [ClientController::class, 'register']);

/*
 * Sign in with Google. The credential is a Google-signed ID token verified server-side against
 * services.google.client_id before any claim in it is read — see ClientController::googleLogin.
 * Throttled like /login: it mints a session, so it is a credential endpoint even though the
 * customer never types anything.
 */
Route::middleware('throttle:10,1')->post('/auth/google', [ClientController::class, 'googleLogin']);

/*
 * ── PASSWORD RESET — ROUTED AT LAST ────────────────────────────────────────────────────────
 * The storefront has had /forgot-password and /reset-password screens for as long as it has had
 * a login form, and both have been POSTing to endpoints that did not exist. Confirmed against
 * the live API on 20/08/2026: both returned 404. Every customer who forgot their password was
 * simply locked out.
 *
 * Tighter throttles than /login, and for a different reason: /forgot-password SENDS AN EMAIL to
 * an address the caller chooses, so an untimed one is a way to use this shop's mail reputation to
 * flood a stranger's inbox. 4/min per IP is generous for a human and useless for that.
 */
Route::middleware('throttle:4,1')->post('/forgot-password', [ClientController::class, 'forgotPassword']);
Route::middleware('throttle:6,1')->post('/reset-password', [ClientController::class, 'resetPassword']);

// ── Authenticated Routes ──────────────────────────────
Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/phone-verification/send', [\App\Http\Controllers\Api\PhoneVerificationController::class, 'send'])->middleware('throttle:5,60');
    Route::post('/phone-verification/verify', [\App\Http\Controllers\Api\PhoneVerificationController::class, 'verify'])->middleware('throttle:10,1');
    Route::post('/phone-verification/claim-bonus', [\App\Http\Controllers\Api\PhoneVerificationController::class, 'claim'])->middleware('throttle:10,1');
    Route::get('/profil', [ClientController::class, 'profil']);
    Route::post('/email-verification/send', [ClientController::class, 'sendEmailVerificationOtp'])
        ->middleware('throttle:5,60');
    Route::post('/email-verification/verify', [ClientController::class, 'verifyEmailOtp'])
        ->middleware('throttle:10,1');
    Route::get('/points/history', [PointsController::class, 'history']);
    Route::get('/client_commandes', [ClientController::class, 'client_commandes']);
    Route::get('/my-reviews', [ReviewThreadController::class, 'mine']);
    Route::post('/update_profile', [ClientController::class, 'update_profile']);
    Route::post('/detail_commande/{id}', [ClientController::class, 'detail_commande'])->whereNumber('id');
    Route::post('/add_review', [ApisController::class, 'add_review']);
});

// ── Tokenized "verified purchase" review flow (PUBLIC — no login) ──────────────
// The order_token in the emailed link proves the purchase, so COD guests (who have
// no account) can still review. Powers the /avis/{token} page + review-request email.
/*
 * Throttled, which they were not.
 *
 * A 64-character order_token is unguessable and needed no rate limit. The 10-character
 * `review_code` that makes the link fit in one SMS is 32^10 — still far out of reach, but only
 * because nobody is allowed to sit on this endpoint making millions of attempts. The limit is what
 * turns "very large" into "unreachable"; without it, adding the short code would have quietly
 * weakened the review flow.
 */
Route::middleware('throttle:20,1')->get('/reviews/order/{token}', [ReviewController::class, 'orderForReview']);
Route::middleware('throttle:10,1')->post('/reviews/by-order', [ReviewController::class, 'storeByToken']);

/*
 * ── THE THREAD UNDER AN AVIS, AND THE MEMBER WHO WROTE IT ──────────────────────────────────
 * All four are PUBLIC. A reply and a guest review are both things a visitor with no account is
 * meant to be able to do, so `auth:sanctum` would defeat the feature — but `$request->user()`
 * still resolves a bearer token when one is sent, which is how a signed-in customer's reply gets
 * attributed to their account without a second endpoint.
 *
 * ── WHY THE WRITE LIMITS ARE THIS TIGHT ────────────────────────────────────────────────────
 * These endpoints put stranger-written text on a product page. The throttle here is per IP and is
 * the outer wall; `ReviewThreadController` applies a second, per-identity ceiling from
 * config/reviews.php, because one account with a phone and a laptop defeats an IP limit and one
 * household behind a single NAT trips it for everybody.
 *
 * The guest REVIEW limit (5/min) is deliberately harsher than the reply limit (15/min): a review
 * carries a star rating, and this shop has already had to unpublish 203 reviews wholesale for
 * having no purchase behind them. Nothing on this route can reach `Review::scopeAttested`, so none
 * of it can move a rating — but volume alone is still a moderation bill somebody has to pay.
 */
Route::middleware('throttle:60,1')->get('/reviews/{review}/replies', [ReviewThreadController::class, 'index'])->whereNumber('review');
Route::middleware('throttle:15,1')->post('/reviews/{review}/replies', [ReviewThreadController::class, 'store'])->whereNumber('review');
Route::middleware('throttle:5,1')->post('/reviews/guest', [ReviewThreadController::class, 'storeGuestReview']);
Route::middleware('throttle:60,1')->get('/members/{id}', [ReviewThreadController::class, 'publicProfile'])->whereNumber('id');
