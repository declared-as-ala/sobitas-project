<?php

namespace Tests\Feature;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Partner;
use App\Services\PartnerTransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerLedgerBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_available_balance_reads_partner_current_balance_column(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Bal',
            'email' => 'coach-bal@test.local',
            'status' => PartnerStatus::Active->value,
            'commission_rate' => 10,
            'current_balance' => 7.25,
            'total_earned' => 10,
            'total_paid' => 2.75,
        ]);

        $balance = app(PartnerTransactionService::class)->getAvailableBalance($partner);

        $this->assertEquals(7.25, $balance);
    }
}
