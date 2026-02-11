<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Product;
use Filament\Forms;
use Filament\Resources\Form;
use Filament\Resources\Table;
use Filament\Tables;

class ProductResource extends BaseResource
{
    protected static ?string $model = Product::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';

    protected static ?string $permissionSlug = 'products';

    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Tabs::make('Product')
                    ->tabs([
                        Forms\Components\Tabs\Tab::make('General')
                            ->schema([
                                Forms\Components\TextInput::make('designation_fr')
                                    ->label('Name (FR)')
                                    ->required()
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('slug')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('code_product')
                                    ->label('Code')
                                    ->maxLength(255),
                                Forms\Components\Select::make('sous_categorie_id')
                                    ->label('Sous catégorie')
                                    ->relationship('sous_categorie', 'designation_fr')
                                    ->searchable()
                                    ->preload(),
                                Forms\Components\Select::make('brand_id')
                                    ->label('Brand')
                                    ->relationship('brand', 'designation_fr')
                                    ->searchable()
                                    ->preload(),
                                Forms\Components\TextInput::make('qte')
                                    ->numeric(),
                                Forms\Components\Toggle::make('publier')
                                    ->label('Published'),
                                Forms\Components\Toggle::make('rupture')
                                    ->label('In stock'),
                                Forms\Components\TextInput::make('pack')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('new_product')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('best_seller')
                                    ->maxLength(255),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Pricing')
                            ->schema([
                                Forms\Components\TextInput::make('prix_ht')
                                    ->numeric()
                                    ->label('Price HT'),
                                Forms\Components\TextInput::make('prix')
                                    ->numeric()
                                    ->label('Price'),
                                Forms\Components\TextInput::make('promo_ht')
                                    ->numeric()
                                    ->label('Promo HT'),
                                Forms\Components\TextInput::make('promo')
                                    ->numeric()
                                    ->label('Promo'),
                                Forms\Components\DateTimePicker::make('promo_expiration_date')
                                    ->label('Promo Expiration'),
                                Forms\Components\TextInput::make('note')
                                    ->numeric(),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Media')
                            ->schema([
                                Forms\Components\FileUpload::make('cover')
                                    ->disk('public')
                                    ->directory('produits')
                                    ->image()
                                    ->imagePreviewHeight(80),
                                Forms\Components\FileUpload::make('gallery')
                                    ->disk('public')
                                    ->directory('produits')
                                    ->image()
                                    ->multiple()
                                    ->reorderable()
                                    ->formatStateUsing(function ($state) {
                                        if (is_array($state)) {
                                            return $state;
                                        }
                                        if (is_string($state) && $state !== '') {
                                            return json_decode($state, true) ?: [];
                                        }
                                        return [];
                                    })
                                    ->dehydrateStateUsing(function ($state) {
                                        return is_array($state) ? json_encode(array_values($state)) : $state;
                                    }),
                                Forms\Components\TextInput::make('alt_cover')
                                    ->label('Alt Cover')
                                    ->maxLength(255),
                                Forms\Components\TextInput::make('description_cover')
                                    ->label('Cover Description'),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Content')
                            ->schema([
                                Forms\Components\RichEditor::make('description_fr')
                                    ->label('Description (FR)')
                                    ->columnSpanFull(),
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
                            ]),
                        Forms\Components\Tabs\Tab::make('SEO')
                            ->schema([
                                Forms\Components\Textarea::make('meta_description_fr')
                                    ->label('Meta Description (FR)')
                                    ->rows(3),
                                Forms\Components\Textarea::make('meta')
                                    ->label('Meta')
                                    ->rows(3),
                            ])->columns(2),
                        Forms\Components\Tabs\Tab::make('Tags & Aromas')
                            ->schema([
                                Forms\Components\Select::make('tags')
                                    ->relationship('tags', 'designation_fr')
                                    ->multiple()
                                    ->searchable()
                                    ->preload(),
                                Forms\Components\Select::make('aromes')
                                    ->relationship('aromes', 'designation_fr')
                                    ->multiple()
                                    ->searchable()
                                    ->preload(),
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
                Tables\Columns\TextColumn::make('sous_categorie.designation_fr')
                    ->label('Sous catégorie')
                    ->sortable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Brand')
                    ->sortable(),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Price')
                    ->sortable(),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Published')
                    ->boolean(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('sous_categorie_id')
                    ->label('Sous catégorie')
                    ->relationship('sous_categorie', 'designation_fr'),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Brand')
                    ->relationship('brand', 'designation_fr'),
                Tables\Filters\TernaryFilter::make('publier')
                    ->label('Published'),
            ])
            ->actions([
                Tables\Actions\EditAction::make()
                    ->modalHeading('Edit Product'),
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
            'index' => Pages\ListProducts::route('/'),
        ];
    }
}
