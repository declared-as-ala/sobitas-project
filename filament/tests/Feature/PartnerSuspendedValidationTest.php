<?php

namespace Tests\Feature;

use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Coupon;
use App\Models\Partner;
use App\Services\PartnerCommissionService;
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
            'default_commission_rate' => 10,
        ]);

        Coupon::query()->create([
            'partner_id' => $partner->id,
            'is_partner_code' => true,
            'code' => 'SUSP01',
            'type' => Coupon::TYPE_PERCENT,
            'value' => 10,
            'applies_channel' => 'boutique',
            'is_active' => true,
            'applies_to' => Coupon::APPLIES_TO_ORDER,
        ]);

        $svc = app(PartnerCommissionService::class);
        $result = $svc->validatePartnerCodeForTicket('SUSP01', 50.0, null, null, null);

        $this->assertFalse($result['valid']);
    }
}
