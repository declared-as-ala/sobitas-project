<?php

namespace App\Filament\Resources\PartnerPayoutResource\Pages;

use App\Filament\Resources\PartnerPayoutResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPartnerPayout extends EditRecord
{
    protected static string $resource = PartnerPayoutResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }
}
