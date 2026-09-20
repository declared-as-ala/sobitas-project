<?php

namespace App\Filament\Resources\AffilieResource\RelationManagers;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

/**
 * Read-only history of everything that touched this affiliate's balance — the promise at order
 * creation, its confirmation on delivery, the reversal when an order is cancelled, return fees,
 * manual adjustments and payouts. The admin opening an affiliate can see, on the profile itself,
 * exactly what happened and when, including every cancellation. Nothing here is editable: this is
 * an append-only ledger and the record of truth, not a form.
 */
class AffilieTransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'affilieTransactions';

    protected static ?string $title = 'Historique des transactions';

    protected static string | \BackedEnum | null $icon = 'heroicon-o-clock';

    /** Append-only ledger — never created, edited or deleted from the UI. */
    protected static bool $isReadOnly = true;

    public function form(Schema $schema): Schema
    {
        return $schema->schema([]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->defaultSort('id', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn (?AffilieTransactionType $state): string => $state?->label() ?? '—')
                    ->color(fn (?AffilieTransactionType $state): string => match ($state) {
                        AffilieTransactionType::Commission => 'success',
                        AffilieTransactionType::Payment    => 'info',
                        AffilieTransactionType::Reversal   => 'danger',
                        AffilieTransactionType::Adjustment => 'warning',
                        default                            => 'gray',
                    }),
                Tables\Columns\TextColumn::make('description')
                    ->label('Détail')
                    ->wrap()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('commande.numero')
                    ->label('Commande')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant (DT)')
                    ->numeric(decimalPlaces: 3)
                    ->alignEnd()
                    ->color(fn ($state): string => (float) $state < 0 ? 'danger' : 'success')
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Solde après')
                    ->numeric(decimalPlaces: 3)
                    ->alignEnd()
                    ->placeholder('—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (?AffilieTransactionStatus $state): string => $state?->label() ?? '—')
                    ->color(fn (?AffilieTransactionStatus $state): string => match ($state) {
                        AffilieTransactionStatus::Confirmed => 'success',
                        AffilieTransactionStatus::Paid      => 'info',
                        AffilieTransactionStatus::Pending   => 'warning',
                        AffilieTransactionStatus::Cancelled => 'danger',
                        default                             => 'gray',
                    }),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(collect(AffilieTransactionType::cases())->mapWithKeys(
                        fn (AffilieTransactionType $t) => [$t->value => $t->label()]
                    )->all()),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(collect(AffilieTransactionStatus::cases())->mapWithKeys(
                        fn (AffilieTransactionStatus $s) => [$s->value => $s->label()]
                    )->all()),
            ])
            ->emptyStateHeading('Aucune transaction')
            ->emptyStateDescription('Les commissions, annulations, frais et versements de cet affilié apparaîtront ici.');
    }
}
