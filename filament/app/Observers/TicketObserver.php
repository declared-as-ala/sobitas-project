<?php

namespace App\Observers;

use App\Models\LoyaltyProgramSetting;
use App\Models\Ticket;
use App\Services\LoyaltyService;
use Illuminate\Support\Facades\Log;

class TicketObserver
{
    public function updated(Ticket $ticket): void
    {
        if (! $ticket->wasChanged('status')) {
            return;
        }

        $reversalStatuses = LoyaltyProgramSetting::val('ticket_reversal_trigger_statuses', ['annulee', 'annuler', 'cancelled']);
        $status = (string) ($ticket->status ?? '');

        if ($status !== '' && in_array($status, $reversalStatuses, true)) {
            try {
                app(LoyaltyService::class)->reversePointsForTicket($ticket);
            } catch (\Throwable $e) {
                Log::error('TicketObserver: loyalty reversal failed', [
                    'ticket_id' => $ticket->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }
    }
}
