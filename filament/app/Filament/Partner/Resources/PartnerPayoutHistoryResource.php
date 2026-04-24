<?php

namespace App\Filament\Partner\Resources;

use App\Filament\Partner\Resources\PartnerPayoutHistoryResource\Pages;
use App\Models\Partner;
use App\Models\PartnerPayout;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPayoutHistoryResource extends Resource
{
    protected static ?string $model = PartnerPayout::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationLabel = 'Historique des paiements';

    protected static ?int $navigationSort = 4;

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
                    ->label('Demandé le')
                    ->dateTime('d/m/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Montant')
                    ->formatStateUsing(fn ($state) => number_format((float) $state, 3, '.', ' ') . ' DT'),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'paid'      => 'success',
                        'pending'   => 'warning',
                        'cancelled' => 'danger',
                        default     => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'paid'      => 'Payé',
                        'pending'   => 'En attente',
                        'cancelled' => 'Annulé',
                        default     => $state,
                    }),
                Tables\Columns\TextColumn::make('paid_at')
                    ->label('Payé le')
                    ->dateTime('d/m/Y')
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('payment_reference')
                    ->label('Référence')
                    ->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPayouts::route('/'),
        ];
    }

    public static function canCreate(): bool { return false; }

    private static function getCurrentPartner(): ?Partner
    {
        return Partner::where('user_id', auth()->id())->first();
    }
}
