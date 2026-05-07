<?php

namespace App\Filament\Resources;

use App\Enums\PartnerAppliesChannel;
use App\Filament\Resources\PartnerPromoCodeResource\Pages;
use App\Models\Coupon;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PartnerPromoCodeResource extends Resource
{
    protected static ?string $model = Coupon::class;

    protected static ?string $slug = 'partner-promo-codes';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-tag';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Codes promo partenaires';

    protected static ?string $modelLabel = 'Code partenaire';

    protected static ?string $pluralModelLabel = 'Codes promo partenaires';

    protected static ?int $navigationSort = 10;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->where('is_partner_code', true)->with(['partner'])->withCount('redemptions');
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make()
                ->schema([
                    Forms\Components\Select::make('partner_id')
                        ->label('Partenaire')
                        ->relationship('partner', 'name')
                        ->searchable()
                        ->preload()
                        ->required(),
                    Forms\Components\Hidden::make('is_partner_code')->default(true),
                    Forms\Components\TextInput::make('code')
                        ->label('Code')
                        ->required()
                        ->maxLength(64)
                        ->unique(ignoreRecord: true)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn ($state, callable $set) => $set('code', $state ? strtoupper(trim((string) $state)) : $state)),
                    Forms\Components\Select::make('type')
                        ->label('Type')
                        ->options([
                            Coupon::TYPE_PERCENT => 'Pourcentage',
                            Coupon::TYPE_FIXED => 'Montant fixe',
                        ])
                        ->default(Coupon::TYPE_PERCENT)
                        ->required(),
                    Forms\Components\TextInput::make('value')
                        ->label('Valeur')
                        ->numeric()
                        ->default(10)
                        ->required(),
                    Forms\Components\TextInput::make('commission_rate')
                        ->label('Commission % (optionnel)')
                        ->numeric()
                        ->nullable(),
                    Forms\Components\Select::make('applies_channel')
                        ->label('Canal')
                        ->options([
                            PartnerAppliesChannel::Boutique->value => PartnerAppliesChannel::Boutique->label(),
                            PartnerAppliesChannel::Both->value => PartnerAppliesChannel::Both->label(),
                            PartnerAppliesChannel::Website->value => PartnerAppliesChannel::Website->label(),
                        ])
                        ->default(PartnerAppliesChannel::Boutique->value)
                        ->required(),
                    Forms\Components\DateTimePicker::make('starts_at')->label('Début')->nullable(),
                    Forms\Components\DateTimePicker::make('ends_at')->label('Fin')->nullable(),
                    Forms\Components\Toggle::make('is_active')->label('Actif')->default(true),
                    Forms\Components\TextInput::make('min_order_amount')->label('Montant min HT')->numeric()->nullable(),
                    Forms\Components\TextInput::make('usage_limit_total')->label('Limite totale')->integer()->nullable(),
                    Forms\Components\TextInput::make('usage_limit_per_client')->label('Limite / client')->integer()->nullable(),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('partner.name')->label('Partenaire')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('code')->label('Code')->searchable(),
                Tables\Columns\TextColumn::make('applies_channel')->label('Canal'),
                Tables\Columns\IconColumn::make('is_active')->label('Actif')->boolean(),
                Tables\Columns\TextColumn::make('redemptions_count')->counts('redemptions')->label('Utilisations'),
            ])
            ->actions([
                Actions\EditAction::make(),
            ])
            ->bulkActions([])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPartnerPromoCodes::route('/'),
            'create' => Pages\CreatePartnerPromoCode::route('/create'),
            'edit' => Pages\EditPartnerPromoCode::route('/{record}/edit'),
        ];
    }
}
