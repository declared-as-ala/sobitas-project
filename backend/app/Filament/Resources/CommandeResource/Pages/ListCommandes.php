<?php

namespace App\Filament\Resources\CommandeResource\Pages;

use App\Commande;
use App\CommandeDetail;
use App\Filament\Resources\CommandeResource;
use App\Product;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class ListCommandes extends ListRecords
{
    protected static string $resource = CommandeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Commande')
                ->using(function (array $data) {
                    return DB::transaction(function () use ($data) {
                        $details = $data['details'] ?? [];
                        unset($data['details']);

                        $commande = new Commande();
                        $commande->fill($data);
                        $commande->etat = $commande->etat ?: 'nouvelle_commande';

                        $nb = Commande::whereYear('created_at', date('Y'))->count() + 1;
                        $commande->numero = date('Y') . '/' . str_pad($nb, 4, '0', STR_PAD_LEFT);

                        $commande->save();

                        $totals = CommandeResource::syncDetails($commande, $details);
                        $commande->prix_ht = $totals['prix_ht'];
                        $commande->prix_ttc = $totals['prix_ttc'];
                        $commande->save();

                        return $commande;
                    });
                }),
        ];
    }
}
