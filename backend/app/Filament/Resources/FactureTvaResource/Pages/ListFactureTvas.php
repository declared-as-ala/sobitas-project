<?php

namespace App\Filament\Resources\FactureTvaResource\Pages;

use App\Coordinate;
use App\FactureTva;
use App\Filament\Resources\FactureTvaResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class ListFactureTvas extends ListRecords
{
    protected static string $resource = FactureTvaResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Facture TVA')
                ->using(function (array $data) {
                    return DB::transaction(function () use ($data) {
                        $details = $data['details'] ?? [];
                        unset($data['details']);

                        $facture = new FactureTva();
                        FactureTvaResource::hydrateClientFromForm($facture, $data);

                        $facture->fill($data);

                        $nb = FactureTva::whereYear('created_at', date('Y'))->count() + 1;
                        $facture->numero = date('Y') . '/' . str_pad($nb, 4, '0', STR_PAD_LEFT);

                        $facture->save();

                        $totals = FactureTvaResource::syncDetails($facture, $details);
                        $facture->prix_ht = $totals['prix_ht'];
                        $facture->tva = $totals['tva'];
                        $facture->prix_ttc = FactureTvaResource::calculateTtc(
                            (float) $facture->prix_ht,
                            (float) $facture->tva,
                            (float) ($facture->remise ?? 0),
                            (float) ($facture->timbre ?? 0)
                        );
                        $facture->save();

                        return $facture;
                    });
                }),
        ];
    }
}
