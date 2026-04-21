<?php

namespace App\Filament\Resources\QuotationResource\Pages;

use App\Coordinate;
use App\Filament\Resources\QuotationResource;
use App\Quotation;
use Filament\Resources\Pages\ListRecords;
use Filament\Tables;
use Illuminate\Support\Facades\DB;

class ListQuotations extends ListRecords
{
    protected static string $resource = QuotationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Tables\Actions\CreateAction::make()
                ->modalHeading('Create Quotation')
                ->using(function (array $data) {
                    return DB::transaction(function () use ($data) {
                        $details = $data['details'] ?? [];
                        unset($data['details']);

                        $quotation = new Quotation();
                        QuotationResource::hydrateClientFromForm($quotation, $data);

                        $quotation->fill($data);

                        $nb = Quotation::whereYear('created_at', date('Y'))->count() + 1;
                        $quotation->numero = date('Y') . '/' . str_pad($nb, 4, '0', STR_PAD_LEFT);

                        $quotation->save();

                        $totals = QuotationResource::syncDetails($quotation, $details);
                        $quotation->prix_ht = $totals['prix_ht'];
                        $quotation->tva = $totals['tva'];
                        $quotation->prix_ttc = QuotationResource::calculateTtc(
                            (float) $quotation->prix_ht,
                            (float) $quotation->tva,
                            (float) ($quotation->remise ?? 0),
                            (float) ($quotation->timbre ?? 0)
                        );
                        $quotation->save();

                        return $quotation;
                    });
                }),
        ];
    }
}
