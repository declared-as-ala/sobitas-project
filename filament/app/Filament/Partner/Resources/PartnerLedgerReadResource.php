<?php

namespace App\Filament\Partner\Resources;

use App\Enums\PartnerCommissionTransactionStatus;
use App\Enums\PartnerCommissionTransactionType;
use App\Filament\Partner\Resources\PartnerLedgerReadResource\Pages;
use App\Models\PartnerCommissionTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerLedgerReadResource extends Resource
{
    protected static ?string $model = PartnerCommissionTransaction::class;

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
        $pid = auth()->user()?->partner?->id;
        $q = parent::getEloquentQuery()->with(['ticket', 'partnerCode']);

        return $pid ? $q->where('partner_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(function (PartnerCommissionTransactionType|string|null $state): string {
                        if ($state instanceof PartnerCommissionTransactionType) {
                            return $state->label();
                        }

                        return PartnerCommissionTransactionType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (PartnerCommissionTransactionStatus|string|null $state): string {
                        if ($state instanceof PartnerCommissionTransactionStatus) {
                            return $state->label();
                        }

                        return PartnerCommissionTransactionStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('ticket.numero')->label('Ticket')->placeholder('—'),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerLedgerRead::route('/'),
        ];
    }
}
