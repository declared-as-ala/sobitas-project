<?php

namespace App\Filament\Resources;

use App\Enums\LoyaltyTransactionType;
use App\Filament\Resources\LoyaltyPointTransactionResource\Pages;
use App\Models\LoyaltyPointTransaction;
use Filament\Actions;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class LoyaltyPointTransactionResource extends Resource
{
    protected static ?string $model = LoyaltyPointTransaction::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-star';

    protected static string|\UnitEnum|null $navigationGroup = 'Fidélité';

    protected static ?string $navigationLabel = 'Transactions points';

    protected static ?int $navigationSort = 2;

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('client.name')
                    ->label('Client')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof LoyaltyTransactionType ? $state->label() : LoyaltyTransactionType::from((string)$state)->label())
                    ->color(fn ($state): string => ($state instanceof LoyaltyTransactionType ? $state : LoyaltyTransactionType::from((string)$state))->color()),
                Tables\Columns\TextColumn::make('points')
                    ->label('Points')
                    ->sortable()
                    ->formatStateUsing(fn ($state) => ($state > 0 ? '+' : '') . $state),
                Tables\Columns\TextColumn::make('monetary_value')
                    ->label('Valeur DT')
                    ->formatStateUsing(fn ($state) => $state !== null ? number_format((float) $state, 3, '.', ' ') . ' DT' : '—')
                    ->toggleable(),
                Tables\Columns\TextColumn::make('order.numero')
                    ->label('Commande')
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->limit(60)
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(LoyaltyTransactionType::options()),
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
            'index' => Pages\ListLoyaltyPointTransactions::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
