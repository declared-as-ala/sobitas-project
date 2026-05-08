<?php

namespace App\Filament\Resources;

use App\Enums\PartnerTransactionStatus;
use App\Enums\PartnerTransactionType;
use App\Filament\Resources\PartnerCommissionLedgerResource\Pages;
use App\Models\PartnerTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Illuminate\Database\Eloquent\Builder;
class PartnerCommissionLedgerResource extends Resource
{
    protected static ?string $model = PartnerTransaction::class;

    protected static ?string $slug = 'partner-commission-ledger';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-banknotes';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Historique partenaires';

    protected static ?string $modelLabel = 'Écriture';

    protected static ?string $pluralModelLabel = 'Transactions';

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
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof PartnerTransactionType) {
                            return $state->label();
                        }

                        return PartnerTransactionType::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(function (mixed $state): string {
                        if ($state instanceof PartnerTransactionStatus) {
                            return $state->label();
                        }

                        return PartnerTransactionStatus::tryFrom((string) $state)?->label() ?? (string) $state;
                    }),
                Tables\Columns\TextColumn::make('ticket.numero')->label('Ticket')->placeholder('—'),
                Tables\Columns\TextColumn::make('partnerCode.code')->label('Code')->placeholder('—'),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('balance_after')->label('Solde après')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('description')->label('Description')->limit(40)->tooltip(fn ($state) => $state),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                SelectFilter::make('partner_id')
                    ->label('Partenaire')
                    ->relationship('partner', 'name')
                    ->searchable()
                    ->preload(),
                SelectFilter::make('type')
                    ->label('Type')
                    ->options(collect(PartnerTransactionType::cases())->mapWithKeys(fn (PartnerTransactionType $t) => [$t->value => $t->label()])),
                Filter::make('created_at')
                    ->form([
                        \Filament\Forms\Components\DatePicker::make('from')->label('Du'),
                        \Filament\Forms\Components\DatePicker::make('until')->label('Au'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['from'] ?? null,
                                fn (Builder $q, $date): Builder => $q->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['until'] ?? null,
                                fn (Builder $q, $date): Builder => $q->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
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
