<?php

namespace Tests\Unit;

use App\Services\PointsService;
use Tests\TestCase;

class PointsServiceTest extends TestCase
{
    public function test_redeemed_points_reduce_the_earning_base(): void
    {
        $service = new PointsService();

        // 200 DT after coupon/pack, paid as 190 DT + 10 DT in loyalty points.
        $base = $service->earnableSpend(198, 8, 250);

        $this->assertSame(190.0, $base);
        $this->assertSame(190, $service->earnForSpend($base));
    }

    public function test_shipping_and_commercial_discounts_do_not_earn_points(): void
    {
        $service = new PointsService();

        $base = $service->earnableSpend(188, 8, 250);

        $this->assertSame(180.0, $base);
    }

    public function test_earning_base_can_never_exceed_server_priced_products(): void
    {
        $service = new PointsService();

        $base = $service->earnableSpend(100, 0, 240);

        $this->assertSame(100.0, $base);
    }

    public function test_legacy_redemption_helper_uses_the_new_ten_percent_ceiling(): void
    {
        $service = new PointsService();

        [$points, $discount] = $service->computeRedemption(10_000, 10_000, 100);

        $this->assertSame(200, $points);
        $this->assertSame(10.0, $discount);
    }
}
