<?php

namespace App\Filament\Affilie\Resources;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Affilie\Resources\AffiliePaymentReadResource\Pages;
use App\Models\AffilieTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AffiliePaymentReadResource extends Resource
{
    protected static ?string $model = AffilieTransaction::class;

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
        $pid = auth()->user()?->affilie?->id;
        $q = parent::getEloquentQuery()
            ->where('type', AffilieTransactionType::Payment->value);

        return $pid ? $q->where('affilie_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant payé')
                    ->formatStateUsing(fn ($state): string => number_format(abs((float) $state), 3, '.', ' '))
                    ->alignEnd(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (AffilieTransactionStatus|string|null $state): string {
                        if ($state instanceof AffilieTransactionStatus) {
                            return $state->label();
                        }

                        return AffilieTransactionStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('description')->label('Description')->limit(30),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAffiliePaymentRead::route('/'),
        ];
    }
}
