<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Filament\Resources\FactureTvaResource;
use App\Models\FactureTva;
use Filament\Resources\Pages\CreateRecord;

class CreateFactureTva extends CreateRecord
{
    protected static string $resource = FactureTvaResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $nb = FactureTva::whereYear('created_at', date('Y'))->count() + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $data['numero'] = date('Y') . '/' . $nb;

        return $data;
    }
}
