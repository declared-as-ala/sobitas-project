<?php

namespace Tests\Unit;

use App\Services\PartnerTransactionService;
use PHPUnit\Framework\TestCase;

class PartnerTransactionServiceMathTest extends TestCase
{
    public function test_calculate_commission_amount_rounds(): void
    {
        $svc = new PartnerTransactionService;

        $this->assertSame(12.345, $svc->calculateCommissionAmount(246.9, 5));
        $this->assertSame(0.0, $svc->calculateCommissionAmount(100, 0));
    }
}
