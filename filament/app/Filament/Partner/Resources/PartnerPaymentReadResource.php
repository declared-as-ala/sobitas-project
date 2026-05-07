<?php

namespace App\Filament\Partner\Resources;

use App\Enums\PartnerPayoutStatus;
use App\Filament\Partner\Resources\PartnerPaymentReadResource\Pages;
use App\Models\PartnerPayout;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPaymentReadResource extends Resource
{
    protected static ?string $model = PartnerPayout::class;

    protected static ?string $slug = 'my-payouts';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-currency-euro';

    protected static ?string $navigationLabel = 'Mes paiements';

    protected static ?int $navigationSort = 50;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        $pid = auth()->user()?->partner?->id;
        $q = parent::getEloquentQuery();

        return $pid ? $q->where('partner_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Créé')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => PartnerPayoutStatus::tryFrom((string) $state)?->label() ?? (string) $state),
                Tables\Columns\TextColumn::make('paid_at')->label('Payé le')->dateTime('d/m/Y H:i')->placeholder('—'),
                Tables\Columns\TextColumn::make('payment_reference')->label('Référence')->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPaymentRead::route('/'),
        ];
    }
}
