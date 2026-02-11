<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use Carbon\Carbon;
use App\Filament\Resources\CommandeResource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class DelayedOrdersTable extends BaseWidget
{
    protected static ?string $heading = 'Commandes en Retard';

    protected static ?int $sort = 7;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        $now = Carbon::now();

        return $table
            ->query(
                Commande::query()
                    ->where(function ($query) use ($now) {
                        // Orders in preparation > 24 hours
                        $query->where('etat', 'en_cours_de_preparation')
                            ->where('created_at', '<', $now->copy()->subHours(24));
                    })
                    ->orWhere(function ($query) use ($now) {
                        // Orders ready > 48 hours
                        $query->where('etat', 'prete')
                            ->where('created_at', '<', $now->copy()->subHours(48));
                    })
                    ->select(['id', 'numero', 'nom', 'prenom', 'etat', 'created_at'])
                    ->orderBy('created_at')
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N° Commande')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record) => trim(($record->nom ?? '') . ' ' . ($record->prenom ?? '')))
                    ->searchable(),

                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color(fn (string $state): string => Commande::getStatusColor($state))
                    ->formatStateUsing(fn (string $state): string => Commande::getStatusLabel($state)),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créée le')
                    ->dateTime('d/m/Y H:i'),

                Tables\Columns\TextColumn::make('hours_stuck')
                    ->label('Heures Bloqué')
                    ->badge()
                    ->color(fn ($record) => $this->getUrgencyColor($record))
                    ->formatStateUsing(fn ($record) => $this->calculateHoursStuck($record)),
            ])
            ->defaultSort('created_at', 'asc')
            ->defaultPaginationPageOption(10)
            ->recordUrl(fn (Commande $record): string => CommandeResource::getUrl('edit', ['record' => $record]));
    }

    private function calculateHoursStuck(Commande $record): string
    {
        $hours = $record->created_at->diffInHours(Carbon::now());

        if ($hours >= 72) {
            return round($hours / 24, 1) . ' jours';
        }

        return $hours . 'h';
    }

    private function getUrgencyColor(Commande $record): string
    {
        $hours = $record->created_at->diffInHours(Carbon::now());

        if ($hours >= 72) {
            return 'danger'; // 3+ days
        }
        if ($hours >= 48) {
            return 'warning'; // 2+ days
        }

        return 'info';
    }
}
