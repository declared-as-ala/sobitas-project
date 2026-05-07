<?php

namespace App\Filament\Resources;

use App\Enums\PartnerPayoutStatus;
use App\Filament\Resources\PartnerPayoutAdminResource\Pages;
use App\Models\Partner;
use App\Models\PartnerPayout;
use App\Services\PartnerCommissionService;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPayoutAdminResource extends Resource
{
    protected static ?string $model = PartnerPayout::class;

    protected static ?string $slug = 'partner-payouts-admin';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-currency-euro';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Paiements partenaires';

    protected static ?string $modelLabel = 'Paiement';

    protected static ?string $pluralModelLabel = 'Paiements';

    protected static ?int $navigationSort = 30;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('created_at')->label('Créé')->dateTime('d/m/Y H:i')->sortable(),
                Tables\Columns\TextColumn::make('partner.name')->label('Partenaire')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('amount')->label('Montant')->numeric(decimalPlaces: 3)->alignEnd(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Statut')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => PartnerPayoutStatus::tryFrom((string) $state)?->label() ?? (string) $state),
                Tables\Columns\TextColumn::make('paid_at')->label('Payé le')->dateTime('d/m/Y H:i')->placeholder('—'),
                Tables\Columns\TextColumn::make('payment_reference')->label('Référence')->placeholder('—'),
            ])
            ->defaultSort('created_at', 'desc')
            ->actions([
                Actions\Action::make('markPaid')
                    ->label('Marquer payé')
                    ->icon('heroicon-o-check-circle')
                    ->visible(fn (PartnerPayout $record): bool => $record->status === PartnerPayoutStatus::Pending)
                    ->form([
                        Forms\Components\TextInput::make('payment_reference')->label('Référence paiement')->maxLength(128),
                    ])
                    ->action(function (PartnerPayout $record, array $data): void {
                        app(PartnerCommissionService::class)->markPayoutPaid($record, $data['payment_reference'] ?? null);
                    }),
            ])
            ->bulkActions([]);
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['partner']);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPayoutsAdmin::route('/'),
        ];
    }
}
