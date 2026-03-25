<?php

namespace App\Filament\Exports;

use App\Models\Client;
use Filament\Actions\Exports\ExportColumn;
use Filament\Actions\Exports\Exporter;
use Filament\Actions\Exports\Models\Export;

class ClientExporter extends Exporter
{
    protected static ?string $model = Client::class;

    public static function getColumns(): array
    {
        return [
            ExportColumn::make('name')->label('Nom'),
            ExportColumn::make('email')->label('Email'),
            ExportColumn::make('adresse')->label('Adresse'),
            ExportColumn::make('matricule')->label('Matricule'),
            ExportColumn::make('phone_1')->label('Téléphone 1'),
            ExportColumn::make('phone_2')->label('Téléphone 2'),
            ExportColumn::make('created_at')->label('Date de création'),
        ];
    }

    public static function getCompletedNotificationBody(Export $export): string
    {
        $body = 'Export clients termineé : ' . number_format($export->successful_rows) . ' ligne(s) exportée(s).';

        if ($failedRowsCount = $export->getFailedRowsCount()) {
            $body .= ' ' . number_format($failedRowsCount) . ' ligne(s) ont échoué.';
        }

        return $body;
    }
}
