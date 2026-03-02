<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SousCategoryResource\Pages;
use App\Models\SousCategory;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class SousCategoryResource extends Resource
{
    protected static ?string $model = SousCategory::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-rectangle-group';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'Sous-catégorie';

    protected static ?string $pluralModelLabel = 'Sous-catégories';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\Select::make('categorie_id')
                ->label('Catégorie')
                ->relationship('categorie', 'designation_fr')
                ->required()
                ->searchable()
                ->preload(),
            Forms\Components\TextInput::make('designation_fr')
                ->label('Désignation')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('slug')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            Forms\Components\Textarea::make('description_fr')
                ->label('Description')
                ->maxLength(65535)
                ->columnSpanFull(),
            Forms\Components\TextInput::make('cover')
                ->label('Image')
                ->maxLength(500),
            Forms\Components\TextInput::make('alt_cover')
                ->label('Alt Cover')
                ->maxLength(255),
            Forms\Components\TextInput::make('review_seo')
                ->label('Review (seo)')
                ->maxLength(255),
            Forms\Components\TextInput::make('aggregate_rating_seo')
                ->label('AggregateRating (seo)')
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('categorie:id,designation_fr'))
            ->columns([
                Tables\Columns\TextColumn::make('categorie.designation_fr')
                    ->label('Catégories')
                    ->sortable()
                    ->searchable(),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->label('Slug')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('description_fr')
                    ->label('Description')
                    ->limit(40)
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('alt_cover')
                    ->label('Alt Cover')
                    ->limit(30)
                    ->searchable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('review_seo')
                    ->label('Review (seo)')
                    ->limit(30)
                    ->toggleable(),
                Tables\Columns\TextColumn::make('aggregate_rating_seo')
                    ->label('AggregateRating (seo)')
                    ->limit(30)
                    ->toggleable(),
            ])
            ->actions([
                Actions\ViewAction::make()->slideOver(),
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\DeleteBulkAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListSousCategories::route('/'),
            'create' => Pages\CreateSousCategory::route('/create'),
            'edit'   => Pages\EditSousCategory::route('/{record}/edit'),
        ];
    }
}
