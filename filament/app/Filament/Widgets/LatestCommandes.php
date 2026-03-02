<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LatestCommandes extends BaseWidget
{
    protected static ?string $heading = 'Dernières commandes';

    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                Commande::query()
                    ->select(['id', 'numero', 'nom', 'prenom', 'phone', 'prix_ttc', 'etat', 'region', 'created_at'])
                    ->latest()
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N°'),
                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record) => trim(($record->nom ?? '') . ' ' . ($record->prenom ?? ''))),
                Tables\Columns\TextColumn::make('phone')
                    ->label('Tél.'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total')
                    ->money('TND'),
                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color(fn (string $state): string => Commande::getStatusColor($state))
                    ->formatStateUsing(fn (string $state): string => Commande::getStatusLabel($state)),
                Tables\Columns\TextColumn::make('region')
                    ->label('Région'),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i'),
            ])
            ->defaultPaginationPageOption(10)
            ->defaultSort('created_at', 'desc');
    }
}
