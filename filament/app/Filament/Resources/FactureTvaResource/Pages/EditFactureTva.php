<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditFactureTva extends EditRecord
{
    protected static string $resource = FactureTvaResource::class;

    // remove bottom "Save changes / Cancel"
    protected function getFormActions(): array
    {
        return [];
    }

    public function getTitle(): string
    {
        $num = $this->record?->numero ?? '—';
        return "Facture #{$num}";
    }

    public function getSubheading(): ?string
    {
        $client = $this->record?->client?->name ?? '—';
        $date = optional($this->record?->created_at)->format('d/m/Y') ?? '—';
        $total = number_format((float)($this->record?->prix_ttc ?? 0), 3, '.', ' ') . ' TND';

        return "Client : {$client} · Date : {$date} · Total : {$total}";
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('cancel')
                ->label('Annuler')
                ->color('gray')
                ->url($this->getResource()::getUrl('index')),

            Actions\Action::make('save')
                ->label('Enregistrer')
                ->color('primary')
                ->action('save'),
        ];
    }
}