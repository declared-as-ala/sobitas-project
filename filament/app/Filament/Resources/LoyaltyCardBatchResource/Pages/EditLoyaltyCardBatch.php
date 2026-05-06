<?php

namespace App\Filament\Resources\LoyaltyCardBatchResource\Pages;

use App\Filament\Resources\LoyaltyCardBatchResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditLoyaltyCardBatch extends EditRecord
{
    protected static string $resource = LoyaltyCardBatchResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make()
                ->label('Supprimer le lot')
                ->requiresConfirmation()
                ->modalHeading('Supprimer ce lot de cartes ?')
                ->modalDescription(fn (): string => $this->record->isGenerated()
                    ? 'Toutes les cartes de ce lot seront supprimées. Les tickets liés perdront le lien carte (données fidélité sur le ticket restent).'
                    : 'Ce lot ne contient pas encore de cartes générées.')
                ->modalSubmitActionLabel('Supprimer'),
        ];
    }
}
