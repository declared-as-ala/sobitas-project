<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

    public function getHeading(): string
    {
        return 'Facture #' . $this->record->numero;
    }

    public function getSubheading(): ?string
    {
        $client = $this->record->client?->name ?? '—';
        $date = $this->record->created_at?->format('d/m/Y') ?? '—';
        $total = number_format((float) ($this->record->prix_ttc ?? 0), 3, ',', ' ') . ' TND';

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
                    'printUrl' => route('facture-tvas.print', ['factureTva' => $this->record->id]),
                    'title' => 'Facture ' . $this->record->numero,
                    'showStyleSwitcher' => true,
                ]))
                ->modalSubmitAction(false)
                ->closeParentActions(),
            Actions\DeleteAction::make(),
        ];
    }
}
