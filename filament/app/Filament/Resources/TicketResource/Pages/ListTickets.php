<?php

namespace App\Filament\Resources\TicketResource\Pages;

use App\Filament\Resources\ClientResource;
use App\Filament\Resources\TicketResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListTickets extends ListRecords
{
    protected static string $resource = TicketResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('createClient')
                ->label('Ajouter client')
                ->icon('heroicon-o-user-plus')
                ->color('gray')
                ->url(ClientResource::getUrl('create')),
            Actions\Action::make('create')
                ->label('Ajouter ticket')
                ->icon('heroicon-o-ticket')
                ->color('warning')
                ->extraAttributes([
                    'class' => 'btn btn-warning',
                ])
                ->url(\App\Filament\Pages\TicketPosPage::getUrl()),
        ];
    }
}
