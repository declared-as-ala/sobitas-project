<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Filament\Resources\CommandeResource;
use App\Models\Commande;
use Filament\Resources\Pages\CreateRecord;

class CreateCommande extends CreateRecord
{
    protected static string $resource = CommandeResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Generate order number
        $nb = Commande::whereYear('created_at', date('Y'))->count() + 1;
        $nb = str_pad($nb, 4, '0', STR_PAD_LEFT);
        $data['numero'] = date('Y') . '/' . $nb;
        $data['etat'] = $data['etat'] ?? 'nouvelle_commande';

        return $data;
    }
}
