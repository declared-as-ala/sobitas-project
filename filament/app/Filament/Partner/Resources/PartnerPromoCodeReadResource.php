<?php

namespace App\Filament\Partner\Resources;

use App\Filament\Partner\Resources\PartnerPromoCodeReadResource\Pages;
use App\Models\Coupon;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPromoCodeReadResource extends Resource
{
    protected static ?string $model = Coupon::class;

    protected static ?string $slug = 'my-promo-codes';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-ticket';

    protected static ?string $navigationLabel = 'Mes codes promo';

    protected static ?int $navigationSort = 30;

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
        $q = parent::getEloquentQuery()->where('is_partner_code', true)->withCount('redemptions');

        return $pid ? $q->where('partner_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')->label('Code')->searchable(),
                Tables\Columns\TextColumn::make('type')->label('Type'),
                Tables\Columns\TextColumn::make('value')->label('Valeur'),
                Tables\Columns\TextColumn::make('applies_channel')->label('Canal'),
                Tables\Columns\IconColumn::make('is_active')->label('Actif')->boolean(),
                Tables\Columns\TextColumn::make('redemptions_count')->label('Utilisations')->alignEnd(),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPromoCodesRead::route('/'),
        ];
    }
}
