<?php

namespace App\Filament\Resources\FactureResource\Pages;

use App\Filament\Resources\FactureResource;
use App\Models\Facture;
use Filament\Resources\Pages\CreateRecord;

class CreateFacture extends CreateRecord
{
    protected static string $resource = FactureResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = Facture::whereYear('created_at', date('Y'))->count() + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $data['numero'] = date('Y') . '/' . $nb;

        return $data;
    }
}
