<?php

namespace App\Filament\Resources\TicketResource\Pages;

use App\Filament\Resources\TicketResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditTicket extends EditRecord
{
    protected static string $resource = TicketResource::class;

    public function getHeading(): string
    {
        return 'Ticket #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 2, ',', ' ') . ' TND';

        return "Client : {$client} · Date : {$date} · Total : {$total}";
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('gray')
                ->modalHeading('Aperçu d\'impression')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('tickets.print', ['ticket' => $this->record->id]),
                    'title' => 'Ticket ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false)
                ->closeParentActions(),
            Actions\DeleteAction::make(),
        ];
    }
}
