<?php

namespace App\Filament\Resources;

use App\Enums\AffilieCodeStatus;
use App\Filament\Resources\AffiliePromoCodeResource\Pages;
use App\Models\AffilieCode;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class AffiliePromoCodeResource extends Resource
{
    protected static ?string $model = AffilieCode::class;

    protected static ?string $slug = 'affilie-promo-codes';

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-tag';

    protected static string | \UnitEnum | null $navigationGroup = 'Affiliés';

    protected static ?string $navigationLabel = 'Codes affiliés';

    protected static ?string $modelLabel = 'Code affilié';

    protected static ?string $pluralModelLabel = 'Codes affiliés';

    protected static ?int $navigationSort = 10;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with(['affilie']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Section::make()
                ->schema([
                    Forms\Components\Select::make('affilie_id')
                        ->label('Affilié')
                        ->relationship('affilie', 'name')
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
                        ->helperText('Vide = taux du affilié'),
                    Forms\Components\Select::make('status')
                        ->label('Statut')
                        ->options(collect(AffilieCodeStatus::cases())->mapWithKeys(fn (AffilieCodeStatus $s) => [$s->value => $s->label()]))
                        ->default(AffilieCodeStatus::Active->value)
                        ->required(),
                ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('affilie.name')->label('Affilié')->sortable()->searchable(),
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
            'index' => Pages\ListAffiliePromoCodes::route('/'),
            'create' => Pages\CreateAffiliePromoCode::route('/create'),
            'edit' => Pages\EditAffiliePromoCode::route('/{record}/edit'),
        ];
    }
}
