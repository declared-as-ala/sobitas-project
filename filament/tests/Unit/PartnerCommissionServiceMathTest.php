<?php

namespace Tests\Unit;

use App\Services\PartnerCommissionService;
use App\Services\CouponService;
use PHPUnit\Framework\TestCase;

class PartnerCommissionServiceMathTest extends TestCase
{
    public function test_calculate_commission_amount_rounds(): void
    {
        $svc = new PartnerCommissionService(new CouponService());

        $this->assertSame(12.345, $svc->calculateCommissionAmount(246.9, 5));
        $this->assertSame(0.0, $svc->calculateCommissionAmount(100, 0));
    }
}
