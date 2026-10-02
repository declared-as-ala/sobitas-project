<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Who $request->ip() is, for each way a request reaches php-fpm in production (see the trust
 * boundary in App\Http\Middleware\TrustProxies). Peers and chains are the ones measured in the
 * backend-nginx-v2 access log on 02/10/2026: NPM arrives from the Docker gateway 172.19.0.1, the
 * Next container from 172.19.0.8, Cloudflare edges from 162.158.0.0/15 and 172.64.0.0/13.
 */
class ShopperIpTrustBoundaryTest extends TestCase
{
    private const NPM = '172.19.0.1';
    private const NEXT = '172.19.0.8';
    private const CF_EDGE = '162.158.23.31';

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:', 'cache.default' => 'array']);
        DB::purge('sqlite');
        DB::setDefaultConnection('sqlite');
        // An unknown code is all /coupons/apply needs to look up.
        Schema::create('coupons', function (Blueprint $t): void {
            $t->id();
            $t->string('code');
        });
        foreach (['198.51.100.10', '198.51.100.20', '203.0.113.50'] as $ip) {
            RateLimiter::clear('coupon-apply:'.$ip);
        }
        // Only the coupon bucket is under test; the api write bucket would count these requests too.
        $this->withoutMiddleware(ThrottleRequests::class);

        Route::get('/__shopper-ip', fn (Request $request) => response()->json(['ip' => $request->ip()]));
    }

    private function ipSeenBehind(string $peer, array $headers = []): ?string
    {
        return $this->flushHeaders()->withServerVariables(['REMOTE_ADDR' => $peer])
            ->withHeaders($headers)
            ->getJson('/__shopper-ip')
            ->json('ip');
    }

    private function tryCoupon(string $peer, array $headers = []): int
    {
        return $this->flushHeaders()->withServerVariables(['REMOTE_ADDR' => $peer])
            ->withHeaders($headers)
            ->postJson('/api/coupons/apply', ['code' => 'GUESS'.random_int(1000, 9999), 'subtotal_ht' => 100])
            ->status();
    }

    public function test_two_shoppers_forwarded_by_the_storefront_get_separate_coupon_buckets(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->assertSame(200, $this->tryCoupon(self::NEXT, ['X-Forwarded-For' => '198.51.100.10']));
        }
        $this->assertSame(429, $this->tryCoupon(self::NEXT, ['X-Forwarded-For' => '198.51.100.10']));

        // The next shopper through the same Next container is not locked out by the first one.
        $this->assertSame(200, $this->tryCoupon(self::NEXT, ['X-Forwarded-For' => '198.51.100.20']));
        $this->assertSame(10, RateLimiter::attempts('coupon-apply:198.51.100.10'));
        $this->assertSame(1, RateLimiter::attempts('coupon-apply:198.51.100.20'));
    }

    public function test_a_direct_caller_cannot_buy_a_fresh_bucket_with_its_own_forwarded_for(): void
    {
        // Someone who reaches :8083 without Cloudflare or NPM: a public peer is the client, whatever it claims.
        for ($i = 0; $i < 10; $i++) {
            $this->assertSame(200, $this->tryCoupon('203.0.113.50', [
                'X-Forwarded-For' => '198.51.100.'.$i,
                'CF-Connecting-IP' => '198.51.100.'.$i,
            ]));
        }
        $this->assertSame(429, $this->tryCoupon('203.0.113.50', ['X-Forwarded-For' => '198.51.100.99']));
        $this->assertSame(10, RateLimiter::attempts('coupon-apply:203.0.113.50'));
    }

    public function test_the_storefront_proxy_names_the_shopper(): void
    {
        $this->assertSame('198.51.100.10', $this->ipSeenBehind(self::NEXT, ['X-Forwarded-For' => '198.51.100.10']));
    }

    public function test_through_cloudflare_the_shopper_is_cloudflares_client_not_the_edge(): void
    {
        // admin.protein.tn: Cloudflare appends the client, NPM appends the edge it saw.
        $this->assertSame('197.9.24.160', $this->ipSeenBehind(self::NPM, [
            'X-Forwarded-For' => '6.6.6.6, 197.9.24.160, '.self::CF_EDGE,
            'CF-Connecting-IP' => '197.9.24.160',
        ]));
        // protein.tn/api-proxy: the Next rewrite passes the same chain through unchanged.
        $this->assertSame('197.9.24.160', $this->ipSeenBehind(self::NEXT, [
            'X-Forwarded-For' => '197.9.24.160, 172.70.108.33',
            'CF-Connecting-IP' => '197.9.24.160',
        ]));
    }

    public function test_a_forged_cloudflare_header_that_did_not_come_through_cloudflare_is_ignored(): void
    {
        // Straight to NPM on the origin IP, forging both headers and even a Cloudflare hop: NPM
        // appends the real peer, which is not an edge, so the answer is that peer.
        $this->assertSame('41.230.1.2', $this->ipSeenBehind(self::NPM, [
            'X-Forwarded-For' => '6.6.6.6, '.self::CF_EDGE.', 41.230.1.2',
            'CF-Connecting-IP' => '6.6.6.6',
        ]));
    }

    public function test_cloudflare_ranges_are_not_trusted_as_proxies_in_the_chain(): void
    {
        // A Cloudflare Worker calls from Cloudflare's own range (CF-Connecting-IP is its fixed
        // address). Trusting the range would hand the caller the 6.6.6.6 it typed on the left.
        $this->assertSame('2a06:98c0:3600::103', $this->ipSeenBehind(self::NPM, [
            'X-Forwarded-For' => '6.6.6.6, 2a06:98c0:3600::103, '.self::CF_EDGE,
            'CF-Connecting-IP' => '2a06:98c0:3600::103',
        ]));
    }

    public function test_internal_callers_without_forwarding_stay_themselves(): void
    {
        // The healthcheck and the cached loyalty-rules fetch send no client.
        $this->assertSame(self::NEXT, $this->ipSeenBehind(self::NEXT));
        $this->assertSame('127.0.0.1', $this->ipSeenBehind('127.0.0.1'));
    }
}
