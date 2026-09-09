<?php

namespace App\Filament\Affilie\Resources;

use App\Enums\AffilieTransactionStatus;
use App\Enums\AffilieTransactionType;
use App\Filament\Affilie\Resources\AffilieLedgerReadResource\Pages;
use App\Models\AffilieTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AffilieLedgerReadResource extends Resource
{
    protected static ?string $model = AffilieTransaction::class;

    protected static ?string $slug = 'my-commissions';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationLabel = 'Mes commissions';

    protected static ?int $navigationSort = 40;

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
            ->with(['ticket', 'affilieCode'])
            ->where('type', AffilieTransactionType::Commission->value);

        return $pid ? $q->where('affilie_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(function (AffilieTransactionType|string|null $state): string {
                        if ($state instanceof AffilieTransactionType) {
                            return $state->label();
                        }

                        return AffilieTransactionType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (AffilieTransactionStatus|string|null $state): string {
                        if ($state instanceof AffilieTransactionStatus) {
                            return $state->label();
                        }

                        return AffilieTransactionStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('ticket.numero')->label('Ticket')->placeholder('—'),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAffilieLedgerRead::route('/'),
        ];
    }
}
