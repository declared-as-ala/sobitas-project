<?php

namespace App\Filament\Widgets;

use App\Models\Client;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\DB;
use App\Filament\Resources\ClientResource;


class TopCustomersTable extends BaseWidget
{
    protected static ?string $heading = 'Top 20 Clients (LTV)';

    protected static ?int $sort = 9;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Client::query()
                    ->select([
                        'clients.id',
                        'clients.name',
                        'clients.email',
                        'clients.phone_1',
                        DB::raw('COUNT(commandes.id) as total_orders'),
                        DB::raw('SUM(CASE WHEN commandes.etat != "annuler" THEN commandes.prix_ttc ELSE 0 END) as total_spent'),
                        DB::raw('MAX(commandes.created_at) as last_order_date'),
                    ])
                    ->leftJoin('commandes', 'clients.id', '=', 'commandes.user_id')
                    ->groupBy('clients.id', 'clients.name', 'clients.email', 'clients.phone_1')
                    ->having('total_orders', '>', 0)
                    ->orderByDesc('total_spent')
                    ->limit(20)
            )
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nom')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable()
                    ->limit(30),

                Tables\Columns\TextColumn::make('phone_1')
                    ->label('Téléphone')
                    ->searchable(),

                Tables\Columns\TextColumn::make('total_orders')
                    ->label('Total Commandes')
                    ->badge()
                    ->color('info')
                    ->sortable(),

                Tables\Columns\TextColumn::make('total_spent')
                    ->label('Total Dépensé')
                    ->money('TND')
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('last_order_date')
                    ->label('Dernière Commande')
                    ->dateTime('d/m/Y')
                    ->sortable(),

                Tables\Columns\TextColumn::make('ltv_category')
                    ->label('Catégorie')
                    ->badge()
                    ->color(fn ($record) => $this->getLTVColor($record))
                    ->formatStateUsing(fn ($record) => $this->getLTVCategory($record)),
            ])
            ->defaultSort('total_spent', 'desc')
            ->defaultPaginationPageOption(20)
            ->recordUrl(fn (Client $record): string => ClientResource::getUrl('edit', ['record' => $record]));
    }

    private function getLTVCategory($record): string
    {
        $spent = $record->total_spent ?? 0;

        if ($spent >= 5000) {
            return 'VIP';
        }
        if ($spent >= 2000) {
            return 'Premium';
        }
        if ($spent >= 500) {
            return 'Régulier';
        }

        return 'Standard';
    }

    private function getLTVColor($record): string
    {
        $spent = $record->total_spent ?? 0;

        if ($spent >= 5000) {
            return 'success';
        }
        if ($spent >= 2000) {
            return 'warning';
        }
        if ($spent >= 500) {
            return 'info';
        }

        return 'gray';
    }
}
