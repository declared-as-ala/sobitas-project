<?php

namespace App\Filament\Partner\Resources;

use App\Enums\CommissionTransactionType;
use App\Filament\Partner\Resources\PartnerCommissionHistoryResource\Pages;
use App\Models\Partner;
use App\Models\PartnerCommissionTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerCommissionHistoryResource extends Resource
{
    protected static ?string $model = PartnerCommissionTransaction::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-currency-dollar';

    protected static ?string $navigationLabel = 'Mes gains';

    protected static ?int $navigationSort = 3;

    public static function getEloquentQuery(): Builder
    {
        $partner = static::getCurrentPartner();
        return parent::getEloquentQuery()
            ->where('partner_id', $partner?->id ?? 0)
            ->whereIn('type', [
                CommissionTransactionType::Commission->value,
                CommissionTransactionType::Reversal->value,
                CommissionTransactionType::Adjustment->value,
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn ($state) => $state instanceof CommissionTransactionType ? $state->label() : CommissionTransactionType::from((string)$state)->label())
                    ->color(fn ($state): string => ($state instanceof CommissionTransactionType ? $state : CommissionTransactionType::from((string)$state))->color()),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant')
                    ->formatStateUsing(fn ($state) => ($state >= 0 ? '+' : '') . number_format((float) $state, 3, '.', ' ') . ' DT'),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Solde après')
                    ->formatStateUsing(fn ($state) => $state !== null ? number_format((float) $state, 3, '.', ' ') . ' DT' : '—'),
                Tables\Columns\TextColumn::make('order.numero')
                    ->label('Commande')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('description')
                    ->label('Détail')
                    ->limit(60),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerCommissions::route('/'),
        ];
    }

    public static function canCreate(): bool { return false; }

    private static function getCurrentPartner(): ?Partner
    {
        return Partner::where('user_id', auth()->id())->first();
    }
}
