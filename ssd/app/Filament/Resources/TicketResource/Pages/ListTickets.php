<?php

namespace App\Filament\Resources\TicketResource\Pages;

use App\Filament\Resources\TicketResource;
use App\Ticket;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class ListTickets extends ListRecords
{
    protected static string $resource = TicketResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Créer un ticket')
                ->using(function (array $data) {
                    return DB::transaction(function () use ($data) {
                        $details = $data['details'] ?? [];
                        unset($data['details']);

                        $ticket = new Ticket();
                        TicketResource::hydrateClientFromForm($ticket, $data);

                        $ticket->fill($data);

                        $nb = Ticket::whereYear('created_at', date('Y'))->count() + 1;
                        $ticket->numero = date('Y') . '/' . str_pad($nb, 4, '0', STR_PAD_LEFT);

                        $ticket->save();

                        $totals = TicketResource::syncDetails($ticket, $details);
                        $ticket->prix_ht = $totals['prix_ht'];
                        $ticket->prix_ttc = TicketResource::calculateTtc(
                            (float) $ticket->prix_ht,
                            (float) ($ticket->remise ?? 0)
                        );
                        $ticket->save();

                        return $ticket;
                    });
                }),
        ];
    }
}
