<?php

namespace Tests\Feature;

use App\Enums\PartnerCodeStatus;
use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Partner;
use App\Models\PartnerCode;
use App\Services\PartnerTransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerSuspendedValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_partner_code_invalid_when_partner_suspended(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Susp',
            'email' => 'coach-susp@test.local',
            'status' => PartnerStatus::Suspended->value,
            'commission_rate' => 10,
            'current_balance' => 0,
            'total_earned' => 0,
            'total_paid' => 0,
        ]);

        PartnerCode::query()->create([
            'partner_id' => $partner->id,
            'code' => 'SUSP01',
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'status' => PartnerCodeStatus::Active->value,
            'used_count' => 0,
        ]);

        $svc = app(PartnerTransactionService::class);
        $result = $svc->validatePartnerCodeForTicket('SUSP01', 50.0, null, null, null);

        $this->assertFalse($result['valid']);
    }
}
