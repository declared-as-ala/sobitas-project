<?php

namespace Tests\Feature;

use App\Enums\PartnerCommissionTransactionStatus;
use App\Enums\PartnerCommissionTransactionType;
use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Partner;
use App\Models\PartnerCommissionTransaction;
use App\Services\PartnerCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerLedgerBalanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_available_balance_reflects_commissions_and_pending_payouts(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Bal',
            'email' => 'coach-bal@test.local',
            'status' => PartnerStatus::Active->value,
            'default_commission_rate' => 10,
        ]);

        PartnerCommissionTransaction::query()->create([
            'partner_id' => $partner->id,
            'partner_code_id' => null,
            'ticket_id' => null,
            'type' => PartnerCommissionTransactionType::Commission,
            'status' => PartnerCommissionTransactionStatus::Confirmed,
            'commission_base' => 100,
            'commission_rate' => 10,
            'amount' => 10,
            'balance_after' => 10,
            'description' => 'Test commission',
            'metadata' => [],
            'created_by' => null,
        ]);

        PartnerCommissionTransaction::query()->create([
            'partner_id' => $partner->id,
            'partner_code_id' => null,
            'ticket_id' => null,
            'type' => PartnerCommissionTransactionType::Payout,
            'status' => PartnerCommissionTransactionStatus::Pending,
            'commission_base' => 0,
            'commission_rate' => 0,
            'amount' => 3,
            'balance_after' => 7,
            'description' => 'Test payout pending',
            'metadata' => ['partner_payout_id' => 999],
            'created_by' => null,
        ]);

        $balance = app(PartnerCommissionService::class)->getAvailableBalance($partner);

        $this->assertEquals(7.0, $balance);
    }
}
