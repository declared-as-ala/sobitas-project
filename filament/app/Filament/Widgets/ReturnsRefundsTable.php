<?php

namespace App\Filament\Widgets;

use App\Models\Commande;
use App\Filament\Resources\CommandeResource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Schema;

class ReturnsRefundsTable extends BaseWidget
{
    protected static ?string $heading = 'Retours & Remboursements';

    protected static ?int $sort = 10;

    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        $hasRefundField = Schema::hasColumn('commandes', 'refund_amount');

        if (! $hasRefundField) {
            // Show cancelled orders as fallback
            return $this->getCancelledOrdersTable($table);
        }

        return $table
            ->query(
                Commande::query()
                    ->where('refund_amount', '>', 0)
                    ->select(['id', 'numero', 'nom', 'prenom', 'prix_ttc', 'refund_amount', 'etat', 'note', 'created_at'])
                    ->latest()
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N° Commande')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record) => trim(($record->nom ?? '') . ' ' . ($record->prenom ?? '')))
                    ->searchable(),

                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Montant')
                    ->money('TND'),

                Tables\Columns\TextColumn::make('refund_amount')
                    ->label('Remboursement')
                    ->money('TND')
                    ->color('danger')
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color(fn (string $state): string => Commande::getStatusColor($state))
                    ->formatStateUsing(fn (string $state): string => Commande::getStatusLabel($state)),

                Tables\Columns\TextColumn::make('note')
                    ->label('Raison')
                    ->limit(50)
                    ->tooltip(fn ($record) => $record->note),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(15)
            ->recordUrl(fn (Commande $record): string => CommandeResource::getUrl('edit', ['record' => $record]));
    }

    private function getCancelledOrdersTable(Table $table): Table
    {
        return $table
            ->query(
                Commande::query()
                    ->where('etat', 'annuler')
                    ->select(['id', 'numero', 'nom', 'prenom', 'prix_ttc', 'etat', 'note', 'created_at'])
                    ->latest()
            )
            ->columns([
                Tables\Columns\TextColumn::make('numero')
                    ->label('N° Commande')
                    ->searchable(),

                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($record) => trim(($record->nom ?? '') . ' ' . ($record->prenom ?? '')))
                    ->searchable(),

                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Montant')
                    ->money('TND'),

                Tables\Columns\TextColumn::make('etat')
                    ->label('État')
                    ->badge()
                    ->color('danger')
                    ->formatStateUsing(fn () => 'Annulée'),

                Tables\Columns\TextColumn::make('note')
                    ->label('Raison')
                    ->limit(50),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(15);
    }
}
