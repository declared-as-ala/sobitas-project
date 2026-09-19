<?php

namespace App\Filament\Resources\CommandeAffilieResource\Pages;

use App\Filament\Resources\CommandeAffilieResource;
use Filament\Actions\Action;
use Filament\Resources\Pages\ViewRecord;

class ViewCommandeAffilie extends ViewRecord
{
    protected static string $resource = CommandeAffilieResource::class;

    protected function getHeaderActions(): array
    {
        $facture = $this->getRecord()->factures()->latest('id')->first();

        return $facture ? [
            Action::make('print_bl')
                ->label('Imprimer le BL')
                ->icon('heroicon-o-printer')
                ->url(route('factures.print', ['facture' => $facture->id]))
                ->openUrlInNewTab(),
        ] : [];
    }
}
