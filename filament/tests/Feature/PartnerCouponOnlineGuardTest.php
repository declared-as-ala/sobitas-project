<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Partner;
use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Services\CouponService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerCouponOnlineGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_boutique_only_partner_code_is_rejected_for_online_validation(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Guard',
            'email' => 'coach-guard@test.local',
            'status' => PartnerStatus::Active->value,
            'commission_rate' => 10,
        ]);

        Coupon::query()->create([
            'partner_id' => $partner->id,
            'is_partner_code' => true,
            'code' => 'SHOPONLY',
            'type' => Coupon::TYPE_PERCENT,
            'value' => 10,
            'applies_channel' => 'boutique',
            'is_active' => true,
            'applies_to' => Coupon::APPLIES_TO_ORDER,
        ]);

        $result = app(CouponService::class)->validateCoupon('SHOPONLY', 999.0);

        $this->assertFalse($result['valid']);
        $this->assertNull($result['coupon']);
    }
}
