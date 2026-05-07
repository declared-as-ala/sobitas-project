<?php

namespace Tests\Feature;

use App\Enums\PartnerCommissionTransactionType;
use App\Enums\PartnerStatus;
use App\Enums\PartnerType;
use App\Models\Client;
use App\Models\Coupon;
use App\Models\Partner;
use App\Models\Ticket;
use App\Services\PartnerCommissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerCommissionIdempotencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_process_ticket_commission_is_idempotent(): void
    {
        $partner = Partner::query()->create([
            'type' => PartnerType::Coach->value,
            'name' => 'Coach Test',
            'email' => 'coach@test.local',
            'status' => PartnerStatus::Active->value,
            'default_commission_rate' => 10,
        ]);

        $coupon = Coupon::query()->create([
            'partner_id' => $partner->id,
            'is_partner_code' => true,
            'code' => 'TESTPART',
            'type' => Coupon::TYPE_PERCENT,
            'value' => 5,
            'commission_rate' => 10,
            'applies_channel' => 'boutique',
            'is_active' => true,
            'applies_to' => Coupon::APPLIES_TO_ORDER,
        ]);

        $client = Client::query()->create([
            'name' => 'Client POS Test',
            'email' => 'client-pos@test.local',
            'phone_1' => '21600000000',
        ]);

        $ticket = Ticket::query()->create([
            'type' => Ticket::TYPE_TICKET_CAISSE,
            'numero' => 'T-TEST-' . uniqid(),
            'client_id' => $client->id,
            'remise' => 0,
            'pourcentage_remise' => 0,
            'prix_ht' => 100,
            'prix_ttc' => 90,
            'partner_id' => $partner->id,
            'partner_code_id' => $coupon->id,
            'partner_code_snapshot' => 'TESTPART',
            'partner_discount_amount' => 10,
            'partner_commission_base' => 90,
            'partner_commission_rate' => 10,
            'partner_commission_amount' => 9,
            'partner_commission_processed_at' => null,
        ]);

        $svc = app(PartnerCommissionService::class);
        $svc->processTicketCommission($ticket);
        $svc->processTicketCommission($ticket->fresh());

        $this->assertDatabaseCount('partner_commission_transactions', 1);
        $this->assertNotNull($ticket->fresh()->partner_commission_processed_at);

        $row = \App\Models\PartnerCommissionTransaction::query()->firstOrFail();
        $this->assertEquals(PartnerCommissionTransactionType::Commission, $row->type);
    }
}
