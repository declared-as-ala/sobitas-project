<?php

namespace App\Filament\Resources;

use App\Categ;
use App\Filament\Resources\CategResource\Pages;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class CategResource extends BaseResource
{
    protected static ?string $model = Categ::class;

    protected static ?string $navigationIcon = 'heroicon-o-squares-2x2';

    protected static ?string $permissionSlug = 'categs';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Category')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('General')
                            ->schema([
                                Forms\Components\TextInput::make('designation_fr')
                                    ->label('Name (FR)')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('slug')
                                    ->maxLength(255),
                                Forms\Components\Textarea::make('description_fr')
                                    ->label('Description (FR)')
                                    ->rows(4),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Media')
                            ->schema([
                                Forms\Components\FileUpload::make('cover')
                                    ->disk('public')
                                    ->directory('categories')
                                    ->image()
                                    ->imagePreviewHeight(80),
                                Forms\Components\FileUpload::make('product_liste_cover')
                                    ->disk('public')
                                    ->directory('categories')
                                    ->image()
                                    ->label('Product List Cover'),
                                Forms\Components\TextInput::make('alt_cover')
                                    ->label('Alt Cover')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('description_cover')
                                    ->label('Cover Description'),
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
                Tables\Columns\ImageColumn::make('cover')
                    ->disk('public')
                    ->height(36)
                    ->width(36),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Name (FR)')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('slug')
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Category'),
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
            'index' => Pages\ListCategs::route('/'),
        ];
    }
}
