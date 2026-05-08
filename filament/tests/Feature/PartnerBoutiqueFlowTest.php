<?php

namespace Tests\Feature;

use App\Enums\PartnerCodeStatus;
use App\Enums\PartnerStatus;
use App\Enums\PartnerTransactionStatus;
use App\Enums\PartnerTransactionType;
use App\Enums\PartnerType;
use App\Models\Partner;
use App\Models\PartnerCode;
use App\Models\PartnerTransaction;
use App\Services\PartnerTransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerBoutiqueFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_inactive_partner_code_is_rejected(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach',
            'email' => 'c@test.local',
            'status' => PartnerStatus::Active->value,
            'commission_rate' => 10,
            'current_balance' => 0,
            'total_earned' => 0,
            'total_paid' => 0,
        ]);

        PartnerCode::query()->create([
            'partner_id' => $partner->id,
            'code' => 'OFF',
            'discount_type' => 'percentage',
            'discount_value' => 0,
            'status' => PartnerCodeStatus::Inactive->value,
            'used_count' => 0,
        ]);

        $svc = app(PartnerTransactionService::class);
        $r = $svc->validatePartnerCodeForTicket('OFF', 100.0, null, null, null);

        $this->assertFalse($r['valid']);
    }

    public function test_record_partner_payment_reduces_balance(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Gym->value,
            'name' => 'Gym',
            'email' => 'g@test.local',
            'status' => PartnerStatus::Active->value,
            'commission_rate' => 10,
            'current_balance' => 50,
            'total_earned' => 50,
            'total_paid' => 0,
        ]);

        app(PartnerTransactionService::class)->recordPartnerPayment($partner, 50.0, 'ok', 'REF1');

        $partner->refresh();
        $this->assertEquals(0.0, (float) $partner->current_balance);
        $this->assertEquals(50.0, (float) $partner->total_paid);

        $pay = PartnerTransaction::query()
            ->where('type', PartnerTransactionType::Payment)
            ->where('status', PartnerTransactionStatus::Paid)
            ->firstOrFail();

        $this->assertEquals(-50.0, (float) $pay->amount);
    }
}
