<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use Filament\Support\Enums\FontWeight;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LatestCommandes extends BaseWidget
{
    protected static ?string $heading = 'Dernières commandes';

    protected static ?int $sort = 8;

    protected static bool $isLazy = true;

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
                // Order + when, stacked — the "N°" and "Date" columns merged into one primary cell.
                Tables\Columns\TextColumn::make('numero')
                    ->label('Commande')
                    ->weight(FontWeight::Bold)
                    ->description(fn ($record): ?string => $record->created_at
                        ? $record->created_at->locale('fr')->diffForHumans()
                        : null)
                    ->searchable(),
                // Client + phone, stacked — the "Client" and "Tél." columns merged.
                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record): string => trim(($record->nom ?? '') . ' ' . ($record->prenom ?? '')) ?: '—')
                    ->description(fn ($record): ?string => $record->phone)
                    ->icon('heroicon-m-user-circle')
                    ->iconColor('gray'),
                Tables\Columns\TextColumn::make('region')
                    ->label('Région')
                    ->icon('heroicon-m-map-pin')
                    ->iconColor('gray')
                    ->color('gray')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Total')
                    ->money('TND')
                    ->weight(FontWeight::Bold)
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color(fn (string $state): string => Commande::getStatusColor($state))
                    ->formatStateUsing(fn (string $state): string => Commande::getStatusLabel($state)),
            ])
            ->defaultPaginationPageOption(10)
            ->defaultSort('created_at', 'desc');
    }
}
