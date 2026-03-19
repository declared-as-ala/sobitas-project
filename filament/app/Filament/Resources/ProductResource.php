<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Forms\Components\FileUpload;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
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
            Tabs::make('Produit')
                ->tabs([
                    Tab::make('1. Général')
                        ->schema([
                            Section::make('Identification')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('designation_fr')
                                            ->label('Désignation')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('slug')
                                            ->label('Slug')
                                            ->required()
                                            ->maxLength(255)
                                            ->unique(ignoreRecord: true),
                                        Forms\Components\TextInput::make('code_product')
                                            ->label('Code Produit')
                                            ->maxLength(255),
                                        Forms\Components\Select::make('brand_id')
                                            ->label('Marque')
                                            ->relationship('brand', 'designation_fr')
                                            ->searchable(),
                                        Forms\Components\Select::make('sous_categorie_id')
                                            ->label('Sous-catégories')
                                            ->relationship('sousCategorie', 'designation_fr')
                                            ->searchable(),
                                    ]),
                                ]),
                            Section::make('Médias')
                                ->schema([
                                    FileUpload::make('cover')
                                        ->label('Couverture (image principale)')
                                        ->disk('public')
                                        ->directory('products')
                                        ->image()
                                        ->imageEditor()
                                        ->maxSize(4096),
                                    FileUpload::make('images')
                                        ->label('Gallery (images secondaires)')
                                        ->disk('public')
                                        ->directory('products')
                                        ->image()
                                        ->multiple()
                                        ->reorderable()
                                        ->maxSize(4096),
                                ]),
                            Section::make('Flags produit')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\Toggle::make('pack')->label('Pack'),
                                        Forms\Components\Toggle::make('new_product')->label('New Product'),
                                        Forms\Components\Toggle::make('best_seller')->label('Meilleures ventes'),
                                    ]),
                                ]),
                        ]),

                    Tab::make('2. Stock & état')
                        ->schema([
                            Section::make('📦 Stock')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('qte')
                                            ->label('Qte (quantité)')
                                            ->numeric()
                                            ->default(0)
                                            ->minValue(0)
                                            ->reactive()
                                            ->disabled(fn ($get) => $get('rupture') === true)
                                            ->dehydrated(true)
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                $set('rupture', (int) $state <= 0);
                                            }),
                                        Forms\Components\Toggle::make('rupture')
                                            ->label('Etat de stock (rupture)')
                                            ->default(false)
                                            ->reactive()
                                            ->afterStateUpdated(function ($state, callable $set): void {
                                                if ($state === true) {
                                                    $set('qte', 0);
                                                }
                                            }),
                                        Forms\Components\TextInput::make('low_stock_threshold')
                                            ->label('Seuil stock bas')
                                            ->numeric()
                                            ->default(10)
                                            ->minValue(0),
                                        Forms\Components\TextInput::make('note')
                                            ->label('Nombre d’étoiles (rating)')
                                            ->numeric()
                                            ->minValue(0)
                                            ->maxValue(5),
                                    ]),
                                ]),
                        ]),

                    Tab::make('3. Prix & Promotion')
                        ->schema([
                            Section::make('💰 Prix')
                                ->schema([
                                    Grid::make(3)->schema([
                                        Forms\Components\TextInput::make('prix')
                                            ->label('Prix')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\TextInput::make('prix_ht')
                                            ->label('Prix HT')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\TextInput::make('promo')
                                            ->label('Promo')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\TextInput::make('promo_ht')
                                            ->label('Promo HT')
                                            ->numeric()
                                            ->prefix('DT'),
                                        Forms\Components\DateTimePicker::make('promo_expiration_date')
                                            ->label('Date d’expiration du promo (Ventes Flash)'),
                                    ]),
                                ]),
                        ]),

                    Tab::make('4. Contenu produit')
                        ->schema([
                            Section::make('🧠 Contenu')
                                ->schema([
                                    Forms\Components\RichEditor::make('description_fr')
                                        ->label('Description')
                                        ->columnSpanFull(),
                                    Forms\Components\Placeholder::make('missing_content_fields')
                                        ->label('Questions / Nutrition Values')
                                        ->content('Ces champs ne sont pas en base actuellement (mode: reuse_existing_only).'),
                                ]),
                        ]),

                    Tab::make('5. SEO')
                        ->schema([
                            Section::make('🔍 SEO')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\TextInput::make('meta_title')
                                            ->label('Meta (name;content)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('meta_description')
                                            ->label('Meta Description')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('alt_cover')
                                            ->label('Alt Cover (SEO)')
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('description_cover')
                                            ->label('Description Cover (SEO)')
                                            ->maxLength(500),
                                    ]),
                                    Forms\Components\Placeholder::make('missing_seo_fields')
                                        ->label('Schema / Review / AggregateRating')
                                        ->content('Ces champs ne sont pas en base actuellement (mode: reuse_existing_only).'),
                                ]),
                        ]),

                    Tab::make('6. Classification')
                        ->schema([
                            Section::make('🏷️ Classification')
                                ->schema([
                                    Grid::make(2)->schema([
                                        Forms\Components\Select::make('tags')
                                            ->label('Tags')
                                            ->relationship('tags', 'designation_fr')
                                            ->multiple()
                                            ->searchable(),
                                        Forms\Components\Select::make('aromes')
                                            ->label('Aromas')
                                            ->relationship('aromes', 'designation_fr')
                                            ->multiple()
                                            ->searchable(),
                                    ]),
                                ]),
                        ]),

                    Tab::make('7. Publication')
                        ->schema([
                            Section::make('🧾 Publication')
                                ->schema([
                                    Forms\Components\Toggle::make('publier')
                                        ->label('Publier')
                                        ->default(true),
                                ]),
                        ]),

                    Tab::make('8. Tabilation')
                        ->schema([
                            Section::make('📊 Tabilation (Custom sections / specs)')
                                ->schema([
                                    Forms\Components\Placeholder::make('missing_tabilation_fields')
                                        ->label('Tabilation Zone 1..4')
                                        ->content('Zones non disponibles en base actuellement (mode: reuse_existing_only).'),
                                ]),
                        ]),
                ])
                ->persistTabInQueryString()
                ->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            // Eager load only columns needed for list (avoids loading full relation rows)
            ->modifyQueryUsing(fn (Builder $query) => $query->with(['sousCategorie:id,designation_fr', 'brand:id,designation_fr']))
            ->columns([
                Tables\Columns\ImageColumn::make('cover')
                    ->label('Image')
                    ->disk('public')
                    ->circular()
                    ->size(72),
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
                    ->searchable(),
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
