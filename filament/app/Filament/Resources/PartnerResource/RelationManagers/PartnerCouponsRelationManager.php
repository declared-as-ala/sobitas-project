<?php

namespace App\Filament\Resources\PartnerResource\RelationManagers;

use App\Models\Coupon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;

class PartnerCouponsRelationManager extends RelationManager
{
    protected static string $relationship = 'coupons';

    protected static ?string $title = 'Codes promo partenaires';

    public function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make()->schema([
                Forms\Components\TextInput::make('code')
                    ->label('Code')
                    ->required()
                    ->maxLength(64)
                    ->unique(ignoreRecord: true)
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn ($state, callable $set) => $set('code', $state ? strtoupper(trim((string) $state)) : $state)),
                Forms\Components\Hidden::make('is_partner_code')->default(true),
                Forms\Components\Hidden::make('partner_id')->default(fn () => $this->getOwnerRecord()->getKey()),
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
                    ->nullable()
                    ->helperText('Vide = commission par défaut du partenaire'),
                Forms\Components\Select::make('applies_channel')
                    ->label('Canal')
                    ->options([
                        'boutique' => 'Boutique',
                        'both' => 'Site + boutique',
                    ])
                    ->default('boutique')
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

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('code')->label('Code')->searchable(),
                Tables\Columns\TextColumn::make('type')->label('Type'),
                Tables\Columns\TextColumn::make('value')->label('Valeur'),
                Tables\Columns\TextColumn::make('applies_channel')->label('Canal'),
                Tables\Columns\IconColumn::make('is_active')->label('Actif')->boolean(),
            ])
            ->headerActions([
                Actions\CreateAction::make()
                    ->mutateFormDataUsing(function (array $data): array {
                        $data['partner_id'] = $this->getOwnerRecord()->getKey();
                        $data['is_partner_code'] = true;

                        return $data;
                    }),
            ])
            ->actions([
                Actions\EditAction::make(),
            ]);
    }
}
