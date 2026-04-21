<?php

namespace App\Filament\Widgets;

use App\Commande;
use Filament\Tables;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Database\Eloquent\Builder;

class RecentOrdersWidget extends BaseWidget
{
    protected static ?string $heading = 'Recent Orders';

    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = 'full';

    protected function getTableQuery(): Builder
    {
        return Commande::query()
            ->latest('created_at')
            ->limit(10);
    }

    protected function getTableColumns(): array
    {
        return [
            Tables\Columns\TextColumn::make('numero')
                ->label('Order #')
                ->searchable()
                ->sortable(),
            
            Tables\Columns\TextColumn::make('client_id')
                ->label('Client ID')
                ->sortable(),
            
            Tables\Columns\TextColumn::make('prix_ttc')
                ->label('Total')
                ->money('TND')
                ->sortable(),
            
            Tables\Columns\BadgeColumn::make('etat')
                ->label('Status')
                ->colors([
                    'primary' => 'nouvelle_commande',
                    'warning' => 'en_cours_de_preparation',
                    'success' => 'prete',
                    'info' => 'en_cours_de_livraison',
                    'secondary' => 'expidee',
                ])
                ->formatStateUsing(fn (string $state): string => ucwords(str_replace('_', ' ', $state))),
            
            Tables\Columns\TextColumn::make('created_at')
                ->label('Date')
                ->dateTime()
                ->sortable(),
        ];
    }

    protected function getDefaultTableSortColumn(): ?string
    {
        return 'created_at';
    }

    protected function getDefaultTableSortDirection(): ?string
    {
        return 'desc';
    }

    protected function isTablePaginationEnabled(): bool
    {
        return false;
    }
}
