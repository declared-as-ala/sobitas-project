<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategResource\Pages;
use App\Models\Categ;
use Filament\Forms;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Tables;
use Filament\Actions;
use Filament\Tables\Table;

class CategResource extends Resource
{
    protected static ?string $model = Categ::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-squares-2x2';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 2;

    protected static ?string $modelLabel = 'Catégorie';

    protected static ?string $pluralModelLabel = 'Catégories';

    protected static ?string $recordTitleAttribute = 'designation_fr';

    protected static bool $isGloballySearchable = false;

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Forms\Components\TextInput::make('designation_fr')
                ->label('Désignation')
                ->required()
                ->maxLength(255),
            Forms\Components\TextInput::make('slug')
                ->required()
                ->maxLength(255)
                ->unique(ignoreRecord: true),
            FileUpload::make('cover')
                ->label('Image')
                ->disk('public')
                ->directory('categories')
                ->image()
                ->imageEditor()
                ->maxSize(4096),
            Forms\Components\TextInput::make('meta_title')
                ->label('Meta Title')
                ->maxLength(255),
            Forms\Components\TextInput::make('meta_description')
                ->label('Meta Description')
                ->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular(),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable(),
                Tables\Columns\TextColumn::make('sousCategories_count')
                    ->counts('sousCategories')
                    ->label('Sous-catégories'),
            ])
            ->actions([
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
            'index'  => Pages\ListCategs::route('/'),
            'create' => Pages\CreateCateg::route('/create'),
            'edit'   => Pages\EditCateg::route('/{record}/edit'),
        ];
    }
}

