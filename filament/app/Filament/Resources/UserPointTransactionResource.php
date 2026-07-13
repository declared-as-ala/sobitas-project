<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserPointTransactionResource\Pages;
use App\Models\UserPointTransaction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

/**
 * READ-ONLY ledger for the web loyalty points (User-based).
 * It is an append-only journal — creation is disabled.
 */
class UserPointTransactionResource extends Resource
{
    protected static ?string $model = UserPointTransaction::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-star';

    protected static string|\UnitEnum|null $navigationGroup = 'Système';

    protected static ?int $navigationSort = 90;

    protected static ?string $navigationLabel = 'Points fidélité (web)';

    protected static ?string $modelLabel = 'Point fidélité (web)';

    protected static ?string $pluralModelLabel = 'Points fidélité (web)';

    private const TYPE_LABELS = [
        'earn'       => 'Gain',
        'redeem'     => 'Utilisation',
        'adjustment' => 'Ajustement',
        'expiry'     => 'Expiration',
    ];

    private const TYPE_COLORS = [
        'earn'       => 'success',
        'redeem'     => 'danger',
        'adjustment' => 'warning',
        'expiry'     => 'gray',
    ];

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
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Client')
                    ->placeholder('—')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => self::TYPE_LABELS[$state] ?? $state)
                    ->color(fn (string $state): string => self::TYPE_COLORS[$state] ?? 'gray'),
                Tables\Columns\TextColumn::make('points')
                    ->label('Points')
                    ->formatStateUsing(fn (int $state): string => ($state > 0 ? '+' : '') . $state)
                    ->color(fn (int $state): string => $state >= 0 ? 'success' : 'danger')
                    ->sortable(),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Solde après')
                    ->sortable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Description')
                    ->placeholder('—')
                    ->limit(50)
                    ->toggleable(),
                Tables\Columns\TextColumn::make('commande_id')
                    ->label('Commande')
                    ->placeholder('—')
                    ->toggleable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Type')
                    ->options(self::TYPE_LABELS),
            ])
            ->paginated([25, 50, 100]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUserPointTransactions::route('/'),
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }
}
