<?php

namespace App\Filament\Resources\FactureResource\Pages;

use App\Filament\Resources\FactureResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFacture extends EditRecord
{
    protected static string $resource = FactureResource::class;

    public function getHeading(): string
    {
        return 'Bon de livraison #' . $this->record->numero;
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
                    'printUrl' => route('factures.print', ['facture' => $this->record->id]),
                    'title' => 'Bon de livraison ' . $this->record->numero,
                ]))
                ->modalSubmitAction(false)
                ->closeParentActions(),
            Actions\DeleteAction::make(),
        ];
    }
}
