<?php

namespace App\Filament\Partner\Resources;

use App\Filament\Partner\Resources\PartnerPromoCodeResource\Pages;
use App\Models\Coupon;
use App\Models\Partner;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPromoCodeResource extends Resource
{
    protected static ?string $model = Coupon::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-ticket';

    protected static ?string $navigationLabel = 'Mon code promo';

    protected static ?int $navigationSort = 2;

    public static function getEloquentQuery(): Builder
    {
        $partner = static::getCurrentPartner();
        return parent::getEloquentQuery()->where('partner_id', $partner?->id ?? 0);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')
                    ->label('Code promo')
                    ->formatStateUsing(fn ($state) => strtoupper((string) $state))
                    ->copyable(),
                Tables\Columns\TextColumn::make('type')
                    ->label('Type remise')
                    ->formatStateUsing(fn ($state) => match ($state) {
                        'percent'      => 'Pourcentage',
                        'fixed'        => 'Montant fixe',
                        'free_shipping'=> 'Livraison gratuite',
                        default        => $state,
                    }),
                Tables\Columns\TextColumn::make('value')
                    ->label('Valeur')
                    ->formatStateUsing(fn ($state, $record) => $record->type === 'percent'
                        ? $state . '%'
                        : number_format((float) $state, 3) . ' DT'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Actif')
                    ->boolean(),
                Tables\Columns\TextColumn::make('ends_at')
                    ->label('Expiration')
                    ->dateTime('d/m/Y')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('redemptions_count')
                    ->label('Utilisations')
                    ->counts('redemptions'),
            ])
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPromoCodes::route('/'),
        ];
    }

    public static function canCreate(): bool { return false; }
    public static function canEdit($record): bool { return false; }
    public static function canDelete($record): bool { return false; }

    private static function getCurrentPartner(): ?Partner
    {
        return Partner::where('user_id', auth()->id())->first();
    }
}
