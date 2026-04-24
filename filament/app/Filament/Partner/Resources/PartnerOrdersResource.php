<?php

namespace App\Filament\Partner\Resources;

use App\Filament\Partner\Resources\PartnerOrdersResource\Pages;
use App\Models\Commande;
use App\Models\Partner;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerOrdersResource extends Resource
{
    protected static ?string $model = Commande::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-shopping-cart';

    protected static ?string $navigationLabel = 'Mes commandes';

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
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Date')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('numero')
                    ->label('N° commande')
                    ->searchable(),
                Tables\Columns\TextColumn::make('nom')
                    ->label('Client')
                    ->formatStateUsing(fn ($state, $record) => trim(($record->prenom ?? '') . ' ' . ($record->nom ?? ''))),
                Tables\Columns\TextColumn::make('coupon_code_snapshot')
                    ->label('Code utilisé')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('prix_ttc')
                    ->label('Montant TTC')
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT'),
                Tables\Columns\TextColumn::make('estimated_commission')
                    ->label('Commission estimée')
                    ->formatStateUsing(fn ($state) => $state !== null ? number_format((float) $state, 3, '.', ' ') . ' DT' : '—'),
                Tables\Columns\TextColumn::make('etat')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn ($state) => \App\Models\Commande::getStatusLabel($state))
                    ->color(fn ($state) => \App\Models\Commande::getStatusColor($state)),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerOrders::route('/'),
        ];
    }

    public static function canCreate(): bool { return false; }

    private static function getCurrentPartner(): ?Partner
    {
        return Partner::where('user_id', auth()->id())->first();
    }
}
