<?php

namespace App\Filament\Resources;

use App\Enums\PartnerCodeStatus;
use App\Filament\Resources\PartnerPromoCodeResource\Pages;
use App\Models\PartnerCode;
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
    protected static ?string $model = PartnerCode::class;

    protected static ?string $slug = 'partner-promo-codes';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-tag';

    protected static string | \UnitEnum | null $navigationGroup = 'Partenaires';

    protected static ?string $navigationLabel = 'Codes partenaires';

    protected static ?string $modelLabel = 'Code partenaire';

    protected static ?string $pluralModelLabel = 'Codes partenaires';

    protected static ?int $navigationSort = 10;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['partner']);
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
                    Forms\Components\TextInput::make('code')
                        ->label('Code')
                        ->required()
                        ->maxLength(64)
                        ->unique(ignoreRecord: true)
                        ->live(onBlur: true)
                        ->afterStateUpdated(fn ($state, callable $set) => $set('code', $state ? strtoupper(trim((string) $state)) : $state)),
                    Forms\Components\Select::make('discount_type')
                        ->label('Type de remise')
                        ->options([
                            'percentage' => 'Pourcentage',
                            'fixed' => 'Montant fixe (HT)',
                        ])
                        ->default('percentage')
                        ->required(),
                    Forms\Components\TextInput::make('discount_value')
                        ->label('Valeur remise')
                        ->numeric()
                        ->default(10)
                        ->required()
                        ->helperText('Pourcentage (ex. 10) ou montant HT selon le type'),
                    Forms\Components\TextInput::make('commission_rate')
                        ->label('Commission % (optionnel)')
                        ->numeric()
                        ->nullable()
                        ->helperText('Vide = taux du partenaire'),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(collect(PartnerCodeStatus::cases())->mapWithKeys(fn (PartnerCodeStatus $s) => [$s->value => $s->label()]))
                        ->default(PartnerCodeStatus::Active->value)
                        ->required(),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('partner.name')->label('Partenaire')->sortable()->searchable(),
                Tables\Columns\TextColumn::make('code')->label('Code')->searchable(),
                Tables\Columns\TextColumn::make('discount_type')->label('Type remise'),
                Tables\Columns\TextColumn::make('discount_value')->label('Valeur remise')->alignEnd(),
                Tables\Columns\TextColumn::make('commission_rate')->label('Com. %')->alignEnd()->placeholder('—'),
                Tables\Columns\TextColumn::make('status')->label('Statut')->badge(),
                Tables\Columns\TextColumn::make('used_count')->label('Utilisations')->alignEnd(),
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
