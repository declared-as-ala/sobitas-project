<?php

namespace App\Filament\Partner\Resources;

use App\Filament\Partner\Resources\PartnerSaleTicketResource\Pages;
use App\Models\Ticket;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerSaleTicketResource extends Resource
{
    protected static ?string $model = Ticket::class;

    protected static ?string $slug = 'my-boutique-tickets';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-receipt-percent';

    protected static ?string $navigationLabel = 'Mes tickets';

    protected static ?string $modelLabel = 'Ticket';

    protected static ?string $pluralModelLabel = 'Tickets';

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

    public static function getEloquentQuery(): Builder
    {
        $pid = auth()->user()?->partner?->id;
        $q = parent::getEloquentQuery()->where('type', Ticket::TYPE_TICKET_CAISSE)->with(['client']);

        return $pid ? $q->where('partner_id', $pid) : $q->whereRaw('1 = 0');
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('numero')->label('N°')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('client.name')->label('Client')->placeholder('—'),
                Tables\Columns\TextColumn::make('prix_ttc')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('partner_commission_amount')->label('Commission')->numeric(decimalPlaces: 3)->alignEnd()->placeholder('—'),
                Tables\Columns\TextColumn::make('partner_code_snapshot')->label('Code')->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerSaleTickets::route('/'),
        ];
    }
}
