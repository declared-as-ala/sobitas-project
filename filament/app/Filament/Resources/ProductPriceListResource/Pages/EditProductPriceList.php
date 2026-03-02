<?php

namespace App\Filament\Resources\ProductPriceListResource\Pages;

use App\Filament\Resources\ProductPriceListResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditProductPriceList extends EditRecord
{
    protected static string $resource = ProductPriceListResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('print')
                ->label('Imprimer')
                ->icon('heroicon-o-printer')
                ->color('primary')
                ->modalContent(fn () => view('filament.components.print-modal', [
                    'printUrl' => route('product-price-lists.print', ['productPriceList' => $this->record->id]),
                ])),
            Actions\DeleteAction::make(),
        ];
    }
}
