<?php

namespace App\Filament\Resources\FactureResource\Pages;

use App\Facture;
use App\Filament\Resources\FactureResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class ListFactures extends ListRecords
{
    protected static string $resource = FactureResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Facture')
                ->using(function (array $data) {
                    return DB::transaction(function () use ($data) {
                        $details = $data['details'] ?? [];
                        unset($data['details']);

                        $facture = new Facture();
                        FactureResource::hydrateClientFromForm($facture, $data);

                        $facture->fill($data);

                        $nb = Facture::whereYear('created_at', date('Y'))->count() + 1;
                        $facture->numero = date('Y') . '/' . str_pad($nb, 4, '0', STR_PAD_LEFT);

                        $facture->save();

                        $totals = FactureResource::syncDetails($facture, $details);
                        $facture->prix_ht = $totals['prix_ht'];
                        $facture->prix_ttc = FactureResource::calculateTtc(
                            (float) $facture->prix_ht,
                            (float) ($facture->remise ?? 0)
                        );
                        $facture->save();

                        return $facture;
                    });
                }),
        ];
    }
}
