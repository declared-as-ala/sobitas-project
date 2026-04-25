<?php

namespace Tests\Feature;

use App\Enums\LoyaltyCardStatus;
use App\Enums\LoyaltyTransactionType;
use App\Models\Client;
use App\Models\LoyaltyCard;
use App\Models\LoyaltyProgramSetting;
use App\Models\LoyaltyPointTransaction;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class TicketLoyaltyPosFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->artisan('migrate');
    }

    private function seedLoyaltySettings(): void
    {
        LoyaltyProgramSetting::query()->delete();
        LoyaltyProgramSetting::create([
            'options' => [
                'enabled'                        => true,
                'ticket_earn_trigger_statuses'  => ['paid'],
                'ticket_reversal_trigger_statuses' => ['annulee', 'annuler', 'cancelled'],
                'points_per_currency'            => 1,
                'points_per_dt'                  => 10,
                'min_points_to_redeem'           => 1,
                'max_discount_percent'           => 0.99,
                'allow_manual_adjustment'        => true,
            ],
        ]);
        LoyaltyProgramSetting::forgetMergedCache();
    }

    public function test_process_loyalty_for_paid_ticket_is_idempotent(): void
    {
        if (! Schema::hasTable('tickets') || ! Schema::hasColumn('tickets', 'loyalty_processed_at')) {
            $this->markTestSkipped('Tickets loyalty columns not present.');
        }

        $this->seedLoyaltySettings();

        $client = Client::query()->create([
            'name'    => 'POS Client',
            'email'   => 'pos-' . uniqid('', true) . '@example.com',
            'phone_1' => '22111222',
            'source'  => 'boutique',
            'sms'     => false,
        ]);

        $card = LoyaltyCard::create([
            'client_id'   => $client->id,
            'card_number' => 'TEST-' . strtoupper(uniqid()),
            'qr_token'    => str_repeat('a', 48),
            'status'      => LoyaltyCardStatus::Active->value,
            'issued_at'   => now(),
        ]);

        $ticket = Ticket::query()->create([
            'type'                    => Ticket::TYPE_TICKET_CAISSE,
            'numero'                  => '2099/0001',
            'client_id'               => $client->id,
            'loyalty_card_id'         => $card->id,
            'status'                  => 'paid',
            'prix_ht'                 => 40,
            'prix_ttc'                => 40,
            'remise'                  => 0,
            'pourcentage_remise'      => 0,
            'loyalty_points_redeemed' => 0,
            'loyalty_discount_amount' => 0,
        ]);

        $svc = app(LoyaltyService::class);
        $svc->processLoyaltyForPaidPosTicket($ticket->fresh());
        $svc->processLoyaltyForPaidPosTicket($ticket->fresh());

        $earnCount = LoyaltyPointTransaction::query()
            ->where('ticket_id', $ticket->id)
            ->where('type', LoyaltyTransactionType::Earn)
            ->count();

        $this->assertSame(1, $earnCount);
        $this->assertNotNull($ticket->fresh()->loyalty_processed_at);
    }

    public function test_ticket_cancel_creates_reversal_once(): void
    {
        if (! Schema::hasTable('tickets') || ! Schema::hasColumn('tickets', 'loyalty_processed_at')) {
            $this->markTestSkipped('Tickets loyalty columns not present.');
        }

        $this->seedLoyaltySettings();

        $client = Client::query()->create([
            'name'    => 'POS Client 2',
            'email'   => 'pos2-' . uniqid('', true) . '@example.com',
            'phone_1' => '22111333',
            'source'  => 'boutique',
            'sms'     => false,
        ]);

        $card = LoyaltyCard::create([
            'client_id'   => $client->id,
            'card_number' => 'TEST2-' . strtoupper(uniqid()),
            'qr_token'    => str_repeat('b', 48),
            'status'      => LoyaltyCardStatus::Active->value,
            'issued_at'   => now(),
        ]);

        $ticket = Ticket::query()->create([
            'type'                    => Ticket::TYPE_TICKET_CAISSE,
            'numero'                  => '2099/0002',
            'client_id'               => $client->id,
            'loyalty_card_id'         => $card->id,
            'status'                  => 'paid',
            'prix_ht'                 => 10,
            'prix_ttc'                => 10,
            'remise'                  => 0,
            'pourcentage_remise'      => 0,
            'loyalty_points_redeemed' => 0,
            'loyalty_discount_amount' => 0,
        ]);

        $svc = app(LoyaltyService::class);
        $svc->processLoyaltyForPaidPosTicket($ticket->fresh());

        $ticket->update(['status' => 'annulee']);
        $ticket->update(['status' => 'annulee']);

        $revCount = LoyaltyPointTransaction::query()
            ->where('ticket_id', $ticket->id)
            ->where('type', LoyaltyTransactionType::Reversal)
            ->count();

        $this->assertSame(1, $revCount);
    }
}
