<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-cube';

    protected static string | \UnitEnum | null $navigationGroup = 'Catalogue';

    protected static ?int $navigationSort = 1;

    protected static ?string $recordTitleAttribute = 'designation_fr';

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tabs::make('Produit')->tabs([
                Tab::make('Informations générales')->schema([
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('designation_fr')
                            ->label('Désignation')
                            ->required()
                            ->maxLength(255),
                        Forms\Components\TextInput::make('slug')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true),
                        // Use relationship() instead of manually loading options with pluck()
                        Forms\Components\Select::make('sous_categorie_id')
                            ->label('Sous-catégorie')
                            ->relationship('sousCategorie', 'designation_fr')
                            ->searchable()
                            ->preload(),
                        Forms\Components\Select::make('brand_id')
                            ->label('Marque')
                            ->relationship('brand', 'designation_fr')
                            ->searchable()
                            ->preload(),
                    ]),
                    Forms\Components\RichEditor::make('description_fr')
                        ->label('Description')
                        ->columnSpanFull(),
                ]),

                Tab::make('Prix & Stock')->schema([
                    Grid::make(3)->schema([
                        Forms\Components\TextInput::make('prix')
                            ->label('Prix TTC')
                            ->numeric()
                            ->prefix('DT'),
                        Forms\Components\TextInput::make('prix_ht')
                            ->label('Prix HT')
                            ->numeric()
                            ->prefix('DT'),
                        Forms\Components\TextInput::make('qte')
                            ->label('Quantité en stock')
                            ->numeric()
                            ->default(0),
                    ]),
                    Grid::make(3)->schema([
                        Forms\Components\TextInput::make('promo')
                            ->label('Prix promo')
                            ->numeric()
                            ->prefix('DT'),
                        Forms\Components\TextInput::make('promo_ht')
                            ->label('Prix promo HT')
                            ->numeric()
                            ->prefix('DT'),
                        Forms\Components\DateTimePicker::make('promo_expiration_date')
                            ->label('Expiration promo'),
                    ]),
                ]),

                Tab::make('Médias')->schema([
                    FileUpload::make('cover')
                        ->label('Image principale')
                        ->disk('public')
                        ->directory('products')
                        ->image()
                        ->imageEditor()
                        ->maxSize(4096),
                    Forms\Components\TextInput::make('alt_cover')
                        ->label('Alt image')
                        ->maxLength(255),
                    Forms\Components\TextInput::make('description_cover')
                        ->label('Description image')
                        ->maxLength(500),
                    FileUpload::make('images')
                        ->label('Images supplémentaires')
                        ->disk('public')
                        ->directory('products')
                        ->image()
                        ->multiple()
                        ->reorderable()
                        ->maxSize(4096),
                ]),

                Tab::make('SEO & Flags')->schema([
                    Grid::make(3)->schema([
                        Forms\Components\Toggle::make('publier')
                            ->label('Publié')
                            ->default(true),
                        Forms\Components\Toggle::make('rupture')
                            ->label('En stock')
                            ->default(true),
                        Forms\Components\Toggle::make('new_product')
                            ->label('Nouveau'),
                        Forms\Components\Toggle::make('best_seller')
                            ->label('Best-seller'),
                        Forms\Components\Toggle::make('pack')
                            ->label('Pack'),
                    ]),
                    Grid::make(2)->schema([
                        Forms\Components\TextInput::make('meta_title')
                            ->label('Meta Title')
                            ->maxLength(255),
                        Forms\Components\TextInput::make('meta_description')
                            ->label('Meta Description')
                            ->maxLength(255),
                    ]),
                ]),

                Tab::make('Relations')->schema([
                    Forms\Components\Select::make('tags')
                        ->relationship('tags', 'designation_fr')
                        ->multiple()
                        ->preload()
                        ->searchable(),
                    Forms\Components\Select::make('aromes')
                        ->relationship('aromes', 'designation_fr')
                        ->multiple()
                        ->preload()
                        ->searchable(),
                ]),
            ])->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Eager load relationships displayed in columns to prevent N+1
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['sousCategorie', 'brand']))
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(40),
                Tables\Columns\TextColumn::make('designation_fr')
                    ->label('Désignation')
                    ->searchable()
                    ->sortable()
                    ->limit(40),
                Tables\Columns\TextColumn::make('sousCategorie.designation_fr')
                    ->label('Sous-catégorie')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('brand.designation_fr')
                    ->label('Marque')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('prix')
                    ->label('Prix')
                    ->money('TND')
                    ->sortable(),
                Tables\Columns\TextColumn::make('promo')
                    ->label('Promo')
                    ->money('TND')
                    ->sortable()
                    ->toggleable()
                    ->placeholder('—'),
                Tables\Columns\TextColumn::make('qte')
                    ->label('Stock')
                    ->sortable()
                    ->badge()
                    ->color(fn (int $state): string => $state > 10 ? 'success' : ($state > 0 ? 'warning' : 'danger')),
                Tables\Columns\IconColumn::make('publier')
                    ->label('Publié')
                    ->boolean()
                    ->sortable(),
                Tables\Columns\IconColumn::make('best_seller')
                    ->label('Best')
                    ->boolean()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Créé le')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('created_at', 'desc')
            ->defaultPaginationPageOption(25)
            ->filters([
                Tables\Filters\TernaryFilter::make('publier')
                    ->label('Publié'),
                Tables\Filters\TernaryFilter::make('best_seller')
                    ->label('Best-seller'),
                Tables\Filters\TernaryFilter::make('pack')
                    ->label('Pack'),
                Tables\Filters\TernaryFilter::make('new_product')
                    ->label('Nouveau'),
                Tables\Filters\SelectFilter::make('brand_id')
                    ->label('Marque')
                    ->relationship('brand', 'designation_fr')
                    ->searchable()
                    ->preload(),
            ])
            ->actions([
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit'   => Pages\EditProduct::route('/{record}/edit'),
        ];
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['designation_fr', 'slug'];
    }
}
