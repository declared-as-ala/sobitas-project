<?php

namespace App\Filament\Resources;

use App\Enums\CommissionTransactionStatus;
use App\Enums\CommissionTransactionType;
use App\Enums\PartnerType;
use App\Filament\Resources\PartnerCommissionTransactionResource\Pages;
use App\Models\PartnerCommissionTransaction;
use Filament\Actions;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerCommissionTransactionResource extends Resource
{
    protected static ?string $model = PartnerCommissionTransaction::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-currency-dollar';

    protected static string|\UnitEnum|null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Commissions';

    protected static ?int $navigationSort = 3;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('partner.name')
                    ->label('Partenaire')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('partner.type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof PartnerType ? $state->label() : PartnerType::from((string)$state)->label()),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type transaction')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof CommissionTransactionType ? $state->label() : CommissionTransactionType::from((string)$state)->label())
                    ->color(fn ($state): string => ($state instanceof CommissionTransactionType ? $state : CommissionTransactionType::from((string)$state))->color()),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant')
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT')
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Solde après')
                    ->formatStateUsing(fn ($state) => $state !== null ? number_format((float) $state, 3, '.', ' ') . ' DT' : '—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof CommissionTransactionStatus ? $state->label() : CommissionTransactionStatus::from((string)$state)->label())
                    ->color(fn ($state): string => ($state instanceof CommissionTransactionStatus ? $state : CommissionTransactionStatus::from((string)$state))->color()),
                Tables\Columns\TextColumn::make('order.numero')
                    ->label('Commande')
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->limit(50)
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('partner_id')
                    ->label('Partenaire')
                    ->relationship('partner', 'name')
                    ->searchable()
                    ->preload(),
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(CommissionTransactionType::options()),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Statut')
                    ->options(CommissionTransactionStatus::options()),
                Tables\Filters\Filter::make('date')
                    ->form([
                        \Filament\Forms\Components\DatePicker::make('from')->label('Du'),
                        \Filament\Forms\Components\DatePicker::make('until')->label('Au'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'], fn ($q) => $q->whereDate('created_at', '>=', $data['from']))
                            ->when($data['until'], fn ($q) => $q->whereDate('created_at', '<=', $data['until']));
                    }),
            ])
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerCommissionTransactions::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
