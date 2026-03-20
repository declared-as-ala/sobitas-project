<?php

namespace App\Filament\Resources\ClientResource\Pages;

use App\Filament\Exports\ClientExporter;
use App\Filament\Imports\ClientImporter;
use App\Filament\Resources\ClientResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListClients extends ListRecords
{
    protected static string $resource = ClientResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ImportAction::make()
                ->label('Importer')
                ->importer(ClientImporter::class)
                ->icon('heroicon-o-arrow-up-tray')
                ->color('warning'),

            Actions\ExportAction::make()
                ->label('Exporter')
                ->exporter(ClientExporter::class)
                ->icon('heroicon-o-arrow-down-tray')
                ->color('success'),

            Actions\CreateAction::make(),
        ];
    }
}
