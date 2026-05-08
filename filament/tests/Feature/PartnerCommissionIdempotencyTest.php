<?php

namespace Tests\Feature;

use App\Enums\PartnerCodeStatus;
use App\Enums\PartnerStatus;
use App\Enums\PartnerTransactionType;
use App\Enums\PartnerType;
use App\Models\Client;
use App\Models\Partner;
use App\Models\PartnerCode;
use App\Models\PartnerTransaction;
use App\Models\Ticket;
use App\Services\PartnerTransactionService;
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
            'commission_rate' => 10,
            'current_balance' => 0,
            'total_earned' => 0,
            'total_paid' => 0,
        ]);

        $code = PartnerCode::query()->create([
            'partner_id' => $partner->id,
            'code' => 'TESTPART',
            'discount_type' => 'percentage',
            'discount_value' => 5,
            'commission_rate' => 10,
            'status' => PartnerCodeStatus::Active->value,
            'used_count' => 0,
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
            'partner_code_id' => $code->id,
            'partner_code_snapshot' => 'TESTPART',
            'partner_discount_amount' => 10,
            'partner_commission_base' => 90,
            'partner_commission_rate' => 10,
            'partner_commission_amount' => 9,
            'partner_commission_processed_at' => null,
        ]);

        $svc = app(PartnerTransactionService::class);
        $svc->processTicketCommission($ticket);
        $svc->processTicketCommission($ticket->fresh());

        $this->assertDatabaseCount('partner_transactions', 1);
        $this->assertNotNull($ticket->fresh()->partner_commission_processed_at);

        $row = PartnerTransaction::query()->firstOrFail();
        $this->assertEquals(PartnerTransactionType::Commission, $row->type);

        $partner->refresh();
        $this->assertEquals(9.0, $row->amount);
        $this->assertEquals(9.0, (float) $partner->current_balance);
    }
}
