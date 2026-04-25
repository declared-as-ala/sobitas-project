<?php

namespace App\Filament\Resources;

use App\Enums\LoyaltyTransactionType;
use App\Filament\Resources\LoyaltyTransactionResource\Pages;
use App\Models\LoyaltyPointTransaction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class LoyaltyTransactionResource extends Resource
{
    protected static ?string $model = LoyaltyPointTransaction::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'Clients';

    protected static ?int $navigationSort = 12;

    protected static ?string $navigationLabel = 'Transactions fidélité';

    protected static ?string $modelLabel = 'Transaction fidélité';

    protected static ?string $pluralModelLabel = 'Transactions fidélité';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([]);
    }

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
                Tables\Columns\BadgeColumn::make('type')
                    ->label('Type')
                    ->formatStateUsing(fn (LoyaltyTransactionType $state) => $state->label())
                    ->color(fn (LoyaltyTransactionType $state) => $state->color()),
                Tables\Columns\TextColumn::make('points')
                    ->label('Points')
                    ->formatStateUsing(fn (int $state) => ($state > 0 ? '+' : '') . $state)
                    ->color(fn (int $state) => $state > 0 ? 'success' : 'danger')
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Solde après')
                    ->sortable(),
                Tables\Columns\TextColumn::make('ticket.numero')
                    ->label('Ticket')
                    ->placeholder('—')
                    ->searchable(),
                Tables\Columns\TextColumn::make('card.card_number')
                    ->label('N° Carte')
                    ->placeholder('—')
                    ->searchable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->placeholder('—')
                    ->limit(40)
                    ->toggleable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(collect(LoyaltyTransactionType::cases())->mapWithKeys(
                        fn ($case) => [$case->value => $case->label()]
                    )),
            ])
            ->paginated([25, 50, 100]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLoyaltyTransactions::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
