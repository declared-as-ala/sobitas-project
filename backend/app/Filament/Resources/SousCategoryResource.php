<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SousCategoryResource\Pages;
use App\SousCategory;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class SousCategoryResource extends BaseResource
{
    protected static ?string $model = SousCategory::class;

    protected static ?string $navigationIcon = 'heroicon-o-list-bullet';

    protected static ?string $permissionSlug = 'sous_categories';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Sous Category')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('General')
                            ->schema([
                                Forms\Components\TextInput::make('designation_fr')
                                    ->label('Name (FR)')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('slug')
                                    ->maxLength(255),
                                Forms\Components\Select::make('categorie_id')
                                    ->label('Catégorie')
                                    ->relationship('categorie', 'designation_fr')
                                    ->searchable()
                                    ->preload(),
                                Forms\Components\Textarea::make('description_fr')
                                    ->label('Description (FR)')
                                    ->rows(4),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Content')
                            ->schema([
                                Forms\Components\RichEditor::make('content_seo')
                                    ->label('SEO Content')
                                    ->columnSpanFull(),
                                Forms\Components\RichEditor::make('review')
                                    ->label('Review')
                                    ->columnSpanFull(),
                                Forms\Components\RichEditor::make('nutrition_values')
                                    ->label('Nutrition Values')
                                    ->columnSpanFull(),
                                Forms\Components\RichEditor::make('questions')
                                    ->label('Questions')
                                    ->columnSpanFull(),
                                Forms\Components\Textarea::make('more_details')
                                    ->label('More Details')
                                    ->rows(4)
                                    ->columnSpanFull(),
                            ]),
                        Forms\Components\Tabs\Tab::make('SEO')
                            ->schema([
                                Forms\Components\Textarea::make('meta')
                                    ->label('Meta')
                                    ->rows(3),
                                Forms\Components\TextInput::make('alt_cover')
                                    ->label('Alt Cover'),
                                Forms\Components\TextInput::make('description_cove')
                                    ->label('Cover Description'),
                            ])->columns(2),
                    ])
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('id')
                    ->sortable(),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Name (FR)')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('categorie.designation_fr')
                    ->label('Catégorie')
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Sous Category'),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\DeleteBulkAction::make(),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSousCategories::route('/'),
        ];
    }
}
