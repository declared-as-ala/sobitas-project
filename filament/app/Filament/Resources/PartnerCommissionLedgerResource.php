<?php

namespace App\Filament\Resources;

use App\Enums\PartnerCommissionTransactionStatus;
use App\Enums\PartnerCommissionTransactionType;
use App\Filament\Resources\PartnerCommissionLedgerResource\Pages;
use App\Models\PartnerCommissionTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerCommissionLedgerResource extends Resource
{
    protected static ?string $model = PartnerCommissionTransaction::class;

    protected static ?string $slug = 'partner-commission-ledger';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-banknotes';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Commissions partenaires';

    protected static ?string $modelLabel = 'Écriture';

    protected static ?string $pluralModelLabel = 'Commissions';

    protected static ?int $navigationSort = 20;

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

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('partner.name')->label('Partenaire')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(fn (?string $state): string => PartnerCommissionTransactionType::tryFrom((string) $state)?->label() ?? (string) $state),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => PartnerCommissionTransactionStatus::tryFrom((string) $state)?->label() ?? (string) $state),
                Tables\Columns\TextColumn::make('ticket.numero')->label('Ticket')->placeholder('—'),
                Tables\Columns\TextColumn::make('partnerCode.code')->label('Code')->placeholder('—'),
                Tables\Columns\TextColumn::make('commission_base')->label('Base')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('commission_rate')->label('Taux %')->alignEnd(),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('balance_after')->label('Solde après')->numeric(decimalPlaces: 3)->alignEnd(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([])
            ->actions([])
            ->bulkActions([]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['partner', 'ticket', 'partnerCode']);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerCommissionLedger::route('/'),
        ];
    }
}
