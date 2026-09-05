<?php

namespace Tests\Unit;

use App\Services\PointsService;
use PHPUnit\Framework\TestCase;

class PointsServiceTest extends TestCase
{
    public function test_redeemed_points_do_not_reduce_the_earning_base(): void
    {
        $service = new PointsService();

        // 200 DT after coupon/pack, paid as 190 DT + 10 DT in loyalty points.
        $base = $service->earnableSpend(198, 8, -200, 250);

        $this->assertSame(200.0, $base);
        $this->assertSame(200, $service->earnForSpend($base));
    }

    public function test_shipping_and_commercial_discounts_do_not_earn_points(): void
    {
        $service = new PointsService();

        $base = $service->earnableSpend(188, 8, 0, 250);

        $this->assertSame(180.0, $base);
    }

    public function test_earning_base_can_never_exceed_server_priced_products(): void
    {
        $service = new PointsService();

        $base = $service->earnableSpend(100, 0, -5000, 240);

        $this->assertSame(240.0, $base);
    }

    public function test_redemption_math_caps_balance_and_half_the_basket(): void
    {
        $service = new PointsService();

        [$points, $discount] = $service->computeRedemption(10_000, 10_000, 100);

        $this->assertSame(1000, $points);
        $this->assertSame(50.0, $discount);
    }
}
